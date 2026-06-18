// Load suppliers from localStorage and display them in the table
function loadSuppliers() {
    const suppliers = JSON.parse(localStorage.getItem('suppliers')) || [];
    const supplierTableBody = document.getElementById('supplierTableBody');
    supplierTableBody.innerHTML = '';

    suppliers.forEach((supplier, index) => {
        const row = `<tr>
            <td>${supplier.name}</td>
            <td>${supplier.description}</td>
            <td><button class="btn btn-primary btn-sm edit-btn" data-index="${index}"><i class="fa fa-edit"></i> Edit</button></td>
            <td><button class="btn btn-danger btn-sm delete-btn" data-index="${index}"><i class="fa fa-trash"></i> Delete</button></td>
        </tr>`;
        supplierTableBody.innerHTML += row;
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const index = this.getAttribute('data-index');
            window.location.href = `edit_supplier.html?index=${index}`;
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            if (confirm('Are you sure you want to delete this supplier?')) {
                const index = this.getAttribute('data-index');
                suppliers.splice(index, 1);
                localStorage.setItem('suppliers', JSON.stringify(suppliers));
                loadSuppliers();
            }
        });
    });
}

// Event listener for adding a new supplier
document.getElementById('addSupplierButton').addEventListener('click', function () {
    window.location.href = 'add_supplier.html';
});

document.addEventListener('DOMContentLoaded', loadSuppliers);
// Retrieve the username from localStorage
const username = localStorage.getItem('username');

// Set the username in the profile info
document.getElementById('profileName').innerText = username;
document.getElementById('navProfileName').innerText = username;