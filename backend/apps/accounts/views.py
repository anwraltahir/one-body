import logging

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    UserSerializer,
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    ChangePasswordSerializer,
    GoogleAuthSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


def tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': UserSerializer(user).data,
    }


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(tokens_for_user(user), status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': 'كلمة المرور الحالية غير صحيحة.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'تم تغيير كلمة المرور بنجاح.'})


class LogoutView(APIView):
    """Client-side logout is enough for JWT; endpoint kept for API symmetry."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        return Response({'message': 'تم تسجيل الخروج بنجاح.'})


def _allowed_google_redirect_uris() -> set[str]:
    """Origins / redirect URIs permitted for the OAuth code exchange."""
    uris: set[str] = set()
    frontend = (getattr(settings, 'FRONTEND_URL', '') or '').strip().rstrip('/')
    if frontend:
        uris.add(frontend)
    for origin in getattr(settings, 'CORS_ALLOWED_ORIGINS', []) or []:
        origin = (origin or '').strip().rstrip('/')
        if origin:
            uris.add(origin)
    # Common local dev fallbacks
    uris.update({
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    })
    return uris


class GoogleAuthView(APIView):
    """
    Exchange Google credentials for app JWTs.

    Frontend options:
      1) OAuth redirect authorization code → { code, redirect_uri }
      2) Google Identity Services → { credential: <jwt> }
      3) OAuth access token → { access_token: <token> }
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_type = serializer.validated_data['token_type']

        try:
            if token_type == 'code':
                info = self._info_from_auth_code(
                    serializer.validated_data['code'],
                    serializer.validated_data['redirect_uri'],
                )
            elif token_type == 'access':
                info = self._info_from_access_token(serializer.validated_data['token'])
            else:
                info = self._info_from_id_token(serializer.validated_data['token'])
        except Exception as exc:
            logger.warning('Google auth failed: %s', exc)
            return Response(
                {
                    'detail': (
                        'فشل التحقق من حساب Google. '
                        'تأكد من Client ID/Secret وredirect URI في Google Cloud.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = info.get('email')
        if not email:
            return Response(
                {'detail': 'لم يتم الحصول على البريد من Google.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        google_sub = info.get('sub') or info.get('id')
        user = None
        if google_sub:
            user = User.objects.filter(google_id=google_sub).first()
        if user is None:
            user = User.objects.filter(email__iexact=email).first()

        if user is None:
            user = User.objects.create_user(
                email=email,
                password=None,
                display_name=info.get('name') or email.split('@')[0],
                photo_url=info.get('picture') or '',
                first_name=info.get('given_name') or '',
                last_name=info.get('family_name') or '',
                google_id=google_sub or None,
            )
            user.set_unusable_password()
            user.save()
        else:
            updated = False
            if google_sub and not user.google_id:
                user.google_id = google_sub
                updated = True
            if info.get('picture') and not user.photo_url:
                user.photo_url = info['picture']
                updated = True
            if info.get('name') and (not user.display_name or user.display_name == user.email.split('@')[0]):
                user.display_name = info['name']
                updated = True
            if updated:
                user.save()

        return Response(tokens_for_user(user))

    def _info_from_auth_code(self, code: str, redirect_uri: str) -> dict:
        client_id = settings.GOOGLE_CLIENT_ID
        client_secret = settings.GOOGLE_CLIENT_SECRET
        if not client_id or not client_secret:
            raise ValueError('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured')

        allowed = _allowed_google_redirect_uris()
        normalized = redirect_uri.rstrip('/')
        if normalized not in allowed:
            raise ValueError(f'redirect_uri not allowed: {redirect_uri}')

        resp = requests.post(
            'https://oauth2.googleapis.com/token',
            data={
                'code': code,
                'client_id': client_id,
                'client_secret': client_secret,
                'redirect_uri': normalized,
                'grant_type': 'authorization_code',
            },
            timeout=15,
        )
        if not resp.ok:
            logger.warning('Google token exchange failed: %s %s', resp.status_code, resp.text[:500])
            resp.raise_for_status()
        data = resp.json()

        id_tok = data.get('id_token')
        if id_tok:
            return self._info_from_id_token(id_tok)

        access = data.get('access_token')
        if access:
            return self._info_from_access_token(access)

        raise ValueError('Google token response missing id_token and access_token')

    def _info_from_id_token(self, token: str) -> dict:
        client_id = settings.GOOGLE_CLIENT_ID
        if not client_id:
            # Dev fallback: decode without audience check is unsafe —
            # still require client_id for real verification.
            raise ValueError('GOOGLE_CLIENT_ID is not configured')
        idinfo = google_id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            client_id,
        )
        if idinfo.get('iss') not in ('accounts.google.com', 'https://accounts.google.com'):
            raise ValueError('Invalid issuer')
        return idinfo

    def _info_from_access_token(self, token: str) -> dict:
        resp = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {token}'},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        # Normalize keys to match id_token shape
        if 'id' in data and 'sub' not in data:
            data['sub'] = data['id']
        return data


class GoogleConfigView(APIView):
    """Expose public Google client id so the frontend can start OAuth."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            'googleClientId': settings.GOOGLE_CLIENT_ID or None,
            'googleEnabled': bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET),
            'authMode': 'redirect',
        })
