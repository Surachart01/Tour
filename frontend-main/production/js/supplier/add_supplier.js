document.getElementById('supplierForm').addEventListener('submit', function(event) {
    const transfersChecked = document.getElementById('supplierTransfers').checked;
    const excursionsChecked = document.getElementById('supplierExcursions').checked;
    const toursChecked = document.getElementById('supplierTours').checked;

    if (!transfersChecked && !excursionsChecked && !toursChecked) {
        event.preventDefault();
        document.getElementById('checkboxError').style.display = 'block';
        return;
    }

    const supplier = {
        name: document.getElementById('supplierName').value,
        description: document.getElementById('supplierDescription').value,
        email: document.getElementById('supplierEmail').value,
        telephone: document.getElementById('supplierTelephone').value,
        location: document.getElementById('supplierLocation').value,
        supplierFor: [
            transfersChecked ? 'Transfers' : null,
            excursionsChecked ? 'Excursions' : null,
            toursChecked ? 'Tours' : null
        ].filter(Boolean)
    };

    const suppliers = JSON.parse(localStorage.getItem('suppliers')) || [];
    suppliers.push(supplier);
    localStorage.setItem('suppliers', JSON.stringify(suppliers));

    window.location.href = 'suppliers.html';
});