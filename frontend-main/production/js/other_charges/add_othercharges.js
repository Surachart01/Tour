document.getElementById('chargeForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
        alert("You are not authorized. Please log in first.");
        window.location.href = "login.html";
        return;
    }

    const charge = {
        description: document.getElementById('chargeDescription').value,
        amount: parseFloat(document.getElementById('chargeAmount').value),
        chargetype: document.getElementById('chargeType').value,
    };

    fetch(`${Endpoint}/api/v1/others`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(charge)
    })
    .then(response => {
        if (response.ok) {
            alert("Charge added successfully!");
            window.location.href = 'othercharges.html';
        } else if (response.status === 401) {
            alert("Unauthorized. Please log in again.");
            window.location.href = "login.html";
        } else if (response.status === 403) {
            alert("You don't have permission to perform this action.");
        } else {
            return response.text().then(text => {
                throw new Error(text || "Failed to add other charge");
            });
        }
    })
    .catch(error => {
        console.error("Error adding other charge:", error);
        alert(error.message);
    });
});