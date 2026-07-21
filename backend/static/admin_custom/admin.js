/* Aljasad Alwahid admin UX polish */
(function () {
  function enhance() {
    document.body.classList.add('aljasad-admin');

    // Mark status cells for potential styling hooks
    document.querySelectorAll('#result_list td').forEach(function (td) {
      var text = (td.textContent || '').trim();
      if (['نشط', 'ناجح', 'مقبول', 'قيد المراجعة', 'مرفوض', 'مكتمل'].indexOf(text) !== -1) {
        td.classList.add('status-cell');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhance);
  } else {
    enhance();
  }
})();
