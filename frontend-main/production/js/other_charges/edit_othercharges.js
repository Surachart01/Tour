document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const chargeIndex = urlParams.get('index');
    const charges = JSON.parse(localStorage.getItem('charges')) || [];

    if (chargeIndex !== null && charges[chargeIndex]) {
        const charge = charges[chargeIndex];
        document.getElementById('description').value = charge.description;
        document.getElementById('amount').value = charge.amount;
        document.getElementById('chargeType').value = charge.chargeType;
    } else {
        alert('Charge not found');
        window.location.href = 'othercharges.html';
    }

    document.getElementById('editChargeForm').addEventListener('submit', function (event) {
        event.preventDefault();

        const updatedCharge = {
            description: document.getElementById('description').value,
            amount: document.getElementById('amount').value,
            chargeType: document.getElementById('chargeType').value
        };

        charges[chargeIndex] = updatedCharge;
        localStorage.setItem('charges', JSON.stringify(charges));

        window.location.href = 'othercharges.html';
    });
});