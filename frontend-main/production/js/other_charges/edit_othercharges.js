document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const chargeId = urlParams.get('id');
    const token = localStorage.getItem("token");

    if (!token) {
        alert("You are not authorized. Please log in first.");
        window.location.href = "login.html";
        return;
    }

    if (chargeId) {
        fetch(`${Endpoint}/api/v1/others/${chargeId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    alert("Unauthorized. Please log in again.");
                    window.location.href = "login.html";
                    return;
                }
                throw new Error("Failed to fetch charge details");
            }
            return response.json();
        })
        .then(charge => {
            document.getElementById('description').value = charge.description || '';
            document.getElementById('amount').value = charge.amount || '';
            document.getElementById('chargeType').value = charge.chargetype || charge.chargeType || '';
        })
        .catch(error => {
            console.error("Error fetching charge details:", error);
            alert(error.message);
            window.location.href = 'othercharges.html';
        });
    } else {
        alert('Charge ID not specified');
        window.location.href = 'othercharges.html';
    }

    document.getElementById('editChargeForm').addEventListener('submit', function (event) {
        event.preventDefault();

        const updatedCharge = {
            description: document.getElementById('description').value,
            amount: parseFloat(document.getElementById('amount').value),
            chargetype: document.getElementById('chargeType').value
        };

        fetch(`${Endpoint}/api/v1/others/${chargeId}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updatedCharge)
        })
        .then(response => {
            if (response.ok) {
                alert("Charge updated successfully!");
                window.location.href = 'othercharges.html';
            } else if (response.status === 401) {
                alert("Unauthorized. Please log in again.");
                window.location.href = "login.html";
            } else if (response.status === 403) {
                alert("You don't have permission to perform this action.");
            } else {
                return response.text().then(text => {
                    throw new Error(text || "Failed to update other charge");
                });
            }
        })
        .catch(error => {
            console.error("Error updating charge:", error);
            alert(error.message);
        });
    });
});