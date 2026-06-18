document.getElementById('chargeForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const charge = {
        description: document.getElementById('chargeDescription').value,
        amount: document.getElementById('chargeAmount').value,
        chargeType: document.getElementById('chargeType').value,
    };

    const charges = JSON.parse(localStorage.getItem('charges')) || [];
    charges.push(charge);
    localStorage.setItem('charges', JSON.stringify(charges));

    window.location.href = 'othercharges.html';
});