function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('hidden');
    modal.classList.add('MODAL-LOCK-OPEN');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}
function closeModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('show');
    document.body.style.overflow = '';

    setTimeout(() => {
       modal.classList.remove('MODAL-LOCK-OPEN');
        modal.classList.add('MODAL-LOCK-CLOSED', 'hidden');
    }, 300);
}
