from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Profile payload matching the frontend UserProfile shape."""

    uid = serializers.CharField(source='pk', read_only=True)
    displayName = serializers.CharField(source='display_name', required=False, allow_blank=True)
    photoURL = serializers.URLField(source='photo_url', required=False, allow_blank=True)
    createdAt = serializers.DateTimeField(source='date_joined', read_only=True)
    isSuperuser = serializers.BooleanField(source='is_superuser', read_only=True)
    isStaff = serializers.BooleanField(source='is_staff', read_only=True)

    class Meta:
        model = User
        fields = (
            'uid', 'email', 'displayName', 'photoURL', 'role',
            'phone', 'createdAt', 'first_name', 'last_name',
            'isSuperuser', 'isStaff',
        )
        read_only_fields = ('uid', 'email', 'role', 'createdAt', 'isSuperuser', 'isStaff')


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    displayName = serializers.CharField(source='display_name', required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('email', 'password', 'password_confirm', 'displayName', 'phone')

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'كلمتا المرور غير متطابقتين.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login with email + password; attach user profile to response."""

    username_field = User.EMAIL_FIELD

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])


class GoogleAuthSerializer(serializers.Serializer):
    """Accept Google auth code (OAuth redirect), ID token (GIS), or access token."""

    id_token = serializers.CharField(required=False, allow_blank=True)
    access_token = serializers.CharField(required=False, allow_blank=True)
    credential = serializers.CharField(required=False, allow_blank=True)
    code = serializers.CharField(required=False, allow_blank=True)
    redirect_uri = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        code = (attrs.get('code') or '').strip()
        if code:
            redirect_uri = (attrs.get('redirect_uri') or '').strip()
            if not redirect_uri:
                raise serializers.ValidationError(
                    {'redirect_uri': 'مطلوب redirect_uri مع رمز Google (code).'}
                )
            attrs['code'] = code
            attrs['redirect_uri'] = redirect_uri.rstrip('/')
            attrs['token_type'] = 'code'
            return attrs

        token = attrs.get('id_token') or attrs.get('credential') or attrs.get('access_token')
        if not token:
            raise serializers.ValidationError(
                'مطلوب code أو id_token أو access_token من Google.'
            )
        attrs['token'] = token
        attrs['token_type'] = 'access' if attrs.get('access_token') and not (
            attrs.get('id_token') or attrs.get('credential')
        ) else 'id'
        return attrs
