document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem('token');
  
  if (!token) {
    alert('You are not authorized. Please log in first.');
    window.location.href = 'login.html';
    return;
  }

  const username = localStorage.getItem('username') || 'Guest';
  document.getElementById('profileName').innerText = username;
  document.getElementById('navProfileName').innerText = username;

  // Load tax invoice data
  loadTaxInvoiceData();

  // Add event listeners
  setupEventListeners();
});

let currentInvoiceData = null;
const TAX_PERCENTAGE = 7; // Thailand VAT rate (default)

// Common tax percentages for hotel/travel services worldwide
const TAX_PERCENTAGE_OPTIONS = [
    { value: 0, label: '0% (Tax Exempt)' },
    { value: 5, label: '5% (UAE, EU Reduced)' },
    { value: 6, label: '6% (Malaysia SST)' },
    { value: 7, label: '7% (Thailand VAT)' },
    { value: 8, label: '8% (Singapore GST)' },
    { value: 10, label: '10% (Australia, Vietnam, Japan)' },
    { value: 11, label: '11% (Indonesia VAT)' },
    { value: 12, label: '12% (Philippines, India Lower)' },
    { value: 15, label: '15% (New Zealand GST)' },
    { value: 18, label: '18% (India Higher, EU)' },
    { value: 20, label: '20% (UK, EU Standard)' },
    { value: 25, label: '25% (Denmark, Norway)' }
];

// Sample fallback data for testing when backend has no data
const FALLBACK_INVOICE_DATA = {
    id: 1,
    invoice_number: "001_2024",
    trip_id: "TR2024001",
    agent_name: "Bangkok Travel Co.",
    invoice_date: "2024-01-15T00:00:00Z",
    created_at: "2024-01-15T00:00:00Z",
    total_cost: 25000.00,
    vat_amount: 2334.58,
    non_vat_amount: 22665.42,
    tax_price: 163.42,
    total_tax_price: 163.42,
    final_cost: 25163.42,
    status: "draft",
    categories: [
        {
            id: 1,
            category_name: "hotels",
            total_cost: 15000.00,
            vat_amount: 1401.87,
            non_vat_amount: 13598.13,
            tax_price: 98.13,
            items: [
                { id: 1, description: "Royal Hotel Bangkok", location: "Bangkok", date_range: "2024-01-15 to 2024-01-18", original_cost: 9000.00, discount: 1000.00, final_cost: 8000.00, tax_percentage: 7 },
                { id: 2, description: "Chiang Mai Resort", location: "Chiang Mai", date_range: "2024-01-19 to 2024-01-22", original_cost: 7500.00, discount: 500.00, final_cost: 7000.00, tax_percentage: 7 }
            ]
        },
        {
            id: 2,
            category_name: "transfers",
            total_cost: 5000.00,
            vat_amount: 467.29,
            non_vat_amount: 4532.71,
            tax_price: 32.71,
            items: [
                { id: 3, description: "Airport Transfer", location: "Bangkok Airport", date_range: "2024-01-15", original_cost: 2500.00, discount: 0.00, final_cost: 2500.00, tax_percentage: 7 },
                { id: 4, description: "City Tours Transport", location: "Bangkok-Chiang Mai", date_range: "2024-01-16 to 2024-01-19", original_cost: 2500.00, discount: 0.00, final_cost: 2500.00, tax_percentage: 10 }
            ]
        },
        {
            id: 3,
            category_name: "excursions",
            total_cost: 5000.00,
            vat_amount: 467.29,
            non_vat_amount: 4532.71,
            tax_price: 32.71,
            items: [
                { id: 5, description: "Temple Tour", location: "Bangkok", date_range: "2024-01-16", original_cost: 3200.00, discount: 200.00, final_cost: 3000.00, tax_percentage: 7 },
                { id: 6, description: "River Cruise", location: "Chao Phraya River", date_range: "2024-01-17", original_cost: 2100.00, discount: 100.00, final_cost: 2000.00, tax_percentage: 5 }
            ]
        }
    ]
};

// Utility function to get invoice ID from URL
function getInvoiceIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Load tax invoice data with fallback
async function loadTaxInvoiceData() {
    const invoiceId = getInvoiceIdFromURL();
    
    if (!invoiceId) {
        // If no invoice ID, use fallback data for testing
        console.log('No invoice ID provided, using fallback sample data for testing');
        currentInvoiceData = { ...FALLBACK_INVOICE_DATA };
        populateForm(currentInvoiceData);
        showInfoMessage('Using sample data for testing - no invoice ID provided');
        return;
    }

    try {
        showLoadingState();
        
        const response = await fetch(`${Endpoint}/api/v1/tax-invoice/${invoiceId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem("token")}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data) {
            throw new Error('No invoice data received');
        }
        
        currentInvoiceData = data;
        populateForm(currentInvoiceData);
        
    } catch (error) {
        console.error('Error loading tax invoice:', error);
        
        // Use fallback data on error
        console.log('API error, using fallback sample data for testing');
        currentInvoiceData = { ...FALLBACK_INVOICE_DATA };
        populateForm(currentInvoiceData);
        
        showErrorMessage('Could not load invoice from backend, showing sample data for testing');
    } finally {
        hideLoadingState();
    }
}

// Function to populate the form with invoice data
function populateForm(invoice) {
    // Display header information
    document.getElementById('invoiceNumber').textContent = invoice.invoice_number || 'N/A';
    document.getElementById('tripId').textContent = invoice.trip_id || 'N/A';
    document.getElementById('createdDate').textContent = formatDate(invoice.created_at || invoice.invoice_date);

    // Display categories
    displayCategories(invoice.categories || []);

    // Update summary
    updateSummary();
}

// Function to display categories with editable fields
function displayCategories(categories) {
    const categoriesContainer = document.getElementById('categoriesContainer');
    categoriesContainer.innerHTML = '';

    if (!categories || categories.length === 0) {
        categoriesContainer.innerHTML = '<p class="text-center">No categories found.</p>';
        return;
    }

    categories.forEach((category, categoryIndex) => {
        // Calculate category total cost from items
        const categoryTotalCost = category.items ? 
            category.items.reduce((sum, item) => sum + (item.final_cost || 0), 0) : 0;
        
        // Update category total_cost
        category.total_cost = categoryTotalCost;

        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-section card';
        categoryDiv.innerHTML = `
            <div class="card-header">
                <h5 class="mb-0">
                    <i class="fa fa-${getCategoryIcon(category.category_name)}"></i>
                    ${category.category_name.charAt(0).toUpperCase() + category.category_name.slice(1)} 
                    <span class="badge badge-secondary">${category.items ? category.items.length : 0} items</span>
                </h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped table-bordered table-hover">
                        <thead class="thead-blue">
                            <tr>
                                <th>Description</th>
                                <th>Location</th>
                                <th>Date Range</th>
                                <th>Final Cost</th>
                                <th>Non-VAT Amount</th>
                                <th>VAT Amount</th>
                                <th>Tax %</th>
                                <th>Tax Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${category.items ? category.items.map((item, itemIndex) => `
                                <tr>
                                    <td><strong>${item.description || 'N/A'}</strong></td>
                                    <td><i class="fa fa-map-marker"></i> ${item.location || 'N/A'}</td>
                                    <td><i class="fa fa-calendar"></i> ${item.date_range || 'N/A'}</td>
                                    <td class="text-info">
                                        <strong>${formatCurrency(item.final_cost || 0)}</strong>
                                        <br><small class="text-muted">Original: ${formatCurrency(item.original_cost || 0)}</small>
                                        ${item.discount ? `<br><small class="text-danger">Discount: -${formatCurrency(item.discount)}</small>` : ''}
                                    </td>
                                    <td>
                                        <input type="number" 
                                               class="form-control item-non-vat-field" 
                                               data-category-index="${categoryIndex}"
                                               data-item-index="${itemIndex}"
                                               value="${(item.non_vat_amount || 0).toFixed(2)}" 
                                               step="0.01" 
                                               min="0" 
                                               max="${(item.final_cost || 0).toFixed(2)}"
                                               placeholder="0.00"
                                               style="font-size: 12px;" />
                                        <small class="text-muted">Edit this</small>
                                    </td>
                                    <td>
                                        <div class="readonly-field text-primary" id="item-vat-${categoryIndex}-${itemIndex}">
                                            ${formatCurrency(item.vat_amount || 0)}
                                        </div>
                                        <small class="text-muted">Auto calculated</small>
                                    </td>
                                    <td>
                                        <select class="form-control item-tax-percentage-field" 
                                                data-category-index="${categoryIndex}"
                                                data-item-index="${itemIndex}"
                                                style="font-size: 12px;">
                                            ${TAX_PERCENTAGE_OPTIONS.map(option => `
                                                <option value="${option.value}" ${(item.tax_percentage || TAX_PERCENTAGE) == option.value ? 'selected' : ''}>
                                                    ${option.label}
                                                </option>
                                            `).join('')}
                                        </select>
                                        <small class="text-muted">Select rate</small>
                                    </td>
                                    <td>
                                        <div class="readonly-field text-success" id="item-tax-${categoryIndex}-${itemIndex}">
                                            ${formatCurrency(item.tax_price || 0)}
                                        </div>
                                        <small class="text-muted">Auto calculated</small>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="8" class="text-center text-muted">No items found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        categoriesContainer.appendChild(categoryDiv);
    });

    // Add event listeners for item Non-VAT inputs
    document.querySelectorAll('.item-non-vat-field').forEach(input => {
        input.addEventListener('input', function() {
            const categoryIndex = parseInt(this.getAttribute('data-category-index'));
            const itemIndex = parseInt(this.getAttribute('data-item-index'));
            updateItemCalculations(categoryIndex, itemIndex, parseFloat(this.value) || 0);
        });

        input.addEventListener('blur', function() {
            // Validate input
            const value = parseFloat(this.value) || 0;
            const maxValue = parseFloat(this.getAttribute('max')) || 0;
            
            if (value > maxValue) {
                alert(`Non-VAT amount cannot exceed final cost of ${formatCurrency(maxValue)}`);
                this.value = maxValue.toFixed(2);
                const categoryIndex = parseInt(this.getAttribute('data-category-index'));
                const itemIndex = parseInt(this.getAttribute('data-item-index'));
                updateItemCalculations(categoryIndex, itemIndex, maxValue);
            }
        });
    });

    // Add event listeners for tax percentage dropdowns
    document.querySelectorAll('.item-tax-percentage-field').forEach(select => {
        select.addEventListener('change', function() {
            const categoryIndex = parseInt(this.getAttribute('data-category-index'));
            const itemIndex = parseInt(this.getAttribute('data-item-index'));
            const taxPercentage = parseFloat(this.value) || 0;
            
            // Update the item's tax percentage
            if (currentInvoiceData.categories && 
                currentInvoiceData.categories[categoryIndex] && 
                currentInvoiceData.categories[categoryIndex].items &&
                currentInvoiceData.categories[categoryIndex].items[itemIndex]) {
                
                currentInvoiceData.categories[categoryIndex].items[itemIndex].tax_percentage = taxPercentage;
                
                // Recalculate with current non-VAT amount
                const nonVatInput = document.querySelector(`input.item-non-vat-field[data-category-index="${categoryIndex}"][data-item-index="${itemIndex}"]`);
                const nonVatAmount = nonVatInput ? parseFloat(nonVatInput.value) || 0 : 0;
                updateItemCalculations(categoryIndex, itemIndex, nonVatAmount);
            }
        });
    });

    // Initialize calculations for all items
    calculateAllItemsAndCategories();
}

// Function to get category icon
function getCategoryIcon(categoryName) {
    const icons = {
        'hotels': 'bed',
        'transfers': 'bus', 
        'excursions': 'binoculars',
        'tours': 'map-signs',
        'other': 'cog'
    };
    return icons[categoryName] || 'cog';
}

// Function to update calculations for a specific item
function updateItemCalculations(categoryIndex, itemIndex, nonVatAmount) {
    if (!currentInvoiceData.categories || 
        !currentInvoiceData.categories[categoryIndex] || 
        !currentInvoiceData.categories[categoryIndex].items ||
        !currentInvoiceData.categories[categoryIndex].items[itemIndex]) {
        return;
    }

    const item = currentInvoiceData.categories[categoryIndex].items[itemIndex];
    const finalCost = item.final_cost || 0;

    // Calculate VAT amount (remaining after non-VAT)
    const vatAmount = Math.max(0, finalCost - nonVatAmount);
    
    // Get tax percentage for this specific item (default to global if not set)
    const taxPercentage = item.tax_percentage !== undefined ? item.tax_percentage : TAX_PERCENTAGE;
    
    // Calculate tax price using item's specific tax percentage
    const taxPrice = vatAmount * (taxPercentage / 100);

    // Update the item data
    item.non_vat_amount = nonVatAmount;
    item.vat_amount = vatAmount;
    item.tax_price = taxPrice;
    item.tax_percentage = taxPercentage; // Ensure it's stored

    // Update the item display
    document.getElementById(`item-vat-${categoryIndex}-${itemIndex}`).textContent = formatCurrency(vatAmount);
    document.getElementById(`item-tax-${categoryIndex}-${itemIndex}`).textContent = formatCurrency(taxPrice);

    // Recalculate category totals
    updateCategoryTotals(categoryIndex);
    
    // Update overall summary
    updateSummary();
}

// Function to calculate all items and categories (initialization)
function calculateAllItemsAndCategories() {
    if (!currentInvoiceData.categories) return;

    currentInvoiceData.categories.forEach((category, categoryIndex) => {
        if (category.items) {
            category.items.forEach((item, itemIndex) => {
                // Initialize item calculations if not already set
                if (item.non_vat_amount === undefined) {
                    // Default to 0 non-VAT amount, so all amount is VAT
                    item.non_vat_amount = 0;
                }
                
                // Initialize tax percentage if not set
                if (item.tax_percentage === undefined) {
                    item.tax_percentage = TAX_PERCENTAGE; // Default to 7%
                }
                
                const finalCost = item.final_cost || 0;
                const nonVatAmount = item.non_vat_amount || 0;
                const vatAmount = Math.max(0, finalCost - nonVatAmount);
                const taxPrice = vatAmount * (item.tax_percentage / 100);

                item.vat_amount = vatAmount;
                item.tax_price = taxPrice;

                // Update display if elements exist
                const vatElement = document.getElementById(`item-vat-${categoryIndex}-${itemIndex}`);
                const taxElement = document.getElementById(`item-tax-${categoryIndex}-${itemIndex}`);
                
                if (vatElement) vatElement.textContent = formatCurrency(vatAmount);
                if (taxElement) taxElement.textContent = formatCurrency(taxPrice);
            });
        }
        
        // Update category totals
        updateCategoryTotals(categoryIndex);
    });

    // Update overall summary
    updateSummary();
}

// Function to update category totals from items
function updateCategoryTotals(categoryIndex) {
    if (!currentInvoiceData.categories || !currentInvoiceData.categories[categoryIndex]) {
        return;
    }

    const category = currentInvoiceData.categories[categoryIndex];
    
    if (!category.items || category.items.length === 0) {
        category.total_cost = 0;
        category.non_vat_amount = 0;
        category.vat_amount = 0;
        category.tax_price = 0;
    } else {
        // Calculate totals from items
        category.total_cost = category.items.reduce((sum, item) => sum + (item.final_cost || 0), 0);
        category.non_vat_amount = category.items.reduce((sum, item) => sum + (item.non_vat_amount || 0), 0);
        category.vat_amount = category.items.reduce((sum, item) => sum + (item.vat_amount || 0), 0);
        category.tax_price = category.items.reduce((sum, item) => sum + (item.tax_price || 0), 0);
    }
}

// Function to update the summary section
function updateSummary() {
    if (!currentInvoiceData.categories) {
        return;
    }

    let totalFinalCost = 0;  // Sum of all item final costs (original amounts)
    let totalVATAmount = 0;
    let totalTaxPrice = 0;

    currentInvoiceData.categories.forEach(category => {
        if (category.items) {
            category.items.forEach(item => {
                totalFinalCost += item.final_cost || 0;  // Original final cost from backend
            });
        }
        totalVATAmount += category.vat_amount || 0;
        totalTaxPrice += category.tax_price || 0;
    });

    // Total Cost (Before Tax) = Final Cost - Tax Price
    const totalCostBeforeTax = totalFinalCost - totalTaxPrice;
    
    // Final Amount should equal the original final costs
    const finalAmount = totalCostBeforeTax + totalTaxPrice;

    // Update the summary displays
    document.getElementById('summaryTotalCost').textContent = formatCurrency(totalCostBeforeTax);
    document.getElementById('summaryVATAmount').textContent = formatCurrency(totalVATAmount);
    document.getElementById('summaryTaxPrice').textContent = formatCurrency(totalTaxPrice);
    document.getElementById('summaryFinalAmount').textContent = formatCurrency(finalAmount);

    // Update current invoice data
    currentInvoiceData.total_cost = totalCostBeforeTax;  // Before tax amount
    currentInvoiceData.total_tax_price = totalTaxPrice;
    currentInvoiceData.final_cost = finalAmount;  // Should equal original final costs
}

// Function to setup event listeners
function setupEventListeners() {
    // Save button
    document.getElementById('saveInvoiceBtn').addEventListener('click', () => {
        saveTaxInvoice(getInvoiceIdFromURL());
    });
    
    // PDF button
    document.getElementById('generatePdfBtn').addEventListener('click', () => {
        generatePDF(getInvoiceIdFromURL());
    });
}

// Function to save tax invoice
function saveTaxInvoice(invoiceId) {
    if (!currentInvoiceData) {
        alert('No invoice data to save');
        return;
    }

    // If using sample data, just show a demo message
    if (!invoiceId) {
        alert('This is sample data. In a real scenario, this would save the changes to the backend.');
        return;
    }

    const saveBtn = document.getElementById('saveInvoiceBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';

    const updateData = {
        total_cost: currentInvoiceData.total_cost,
        total_tax_price: currentInvoiceData.total_tax_price,
        final_cost: currentInvoiceData.final_cost,
        categories: currentInvoiceData.categories.map(category => ({
            id: category.id,
            category_name: category.category_name,
            total_cost: category.total_cost,
            vat_amount: category.vat_amount,
            non_vat_amount: category.non_vat_amount,
            tax_percentage: TAX_PERCENTAGE,
            tax_price: category.tax_price,
            items: category.items ? category.items.map(item => ({
                id: item.id,
                description: item.description,
                location: item.location,
                date_range: item.date_range,
                original_cost: item.original_cost,
                discount: item.discount,
                final_cost: item.final_cost,
                non_vat_amount: item.non_vat_amount,
                vat_amount: item.vat_amount,
                tax_percentage: item.tax_percentage,
                tax_price: item.tax_price
            })) : []
        }))
    };

    fetch(`${Endpoint}/api/v1/tax-invoice/${invoiceId}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
    })
    .then((response) => {
        if (!response.ok) {
            if (response.status === 401) {
                alert("Unauthorized. Please log in again.");
                window.location.href = "login.html";
                return;
            } else if (response.status === 403) {
                alert("You don't have sufficient permissions to perform this action.");
                return;
            } else {
                return response.text().then((errorMessage) => {
                    if (!errorMessage) {
                        errorMessage = "Failed to save tax invoice";
                    }
                    throw new Error(errorMessage);
                });
            }
        }
        return response.json();
    })
    .then((result) => {
        if (result) {
            alert('Tax invoice saved successfully!');
            // Reload the data to ensure consistency
            loadTaxInvoiceData();
        }
    })
    .catch((error) => {
        console.error("Error saving tax invoice:", error);
        alert(error.message);
    })
    .finally(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa fa-save"></i> Save Changes';
    });
}

// Function to generate PDF
function generatePDF(invoiceId) {
    // If using sample data, just show a demo message
    if (!invoiceId) {
        alert('This is sample data. In a real scenario, this would generate a PDF from the backend.');
        return;
    }

    const pdfBtn = document.getElementById('generatePdfBtn');
    pdfBtn.disabled = true;
    pdfBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';

    fetch(`${Endpoint}/api/v1/tax-invoice/${invoiceId}/generate-pdf`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem("token")}`,
            'Content-Type': 'application/pdf'
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                alert("Unauthorized. Please log in again.");
                window.location.href = "login.html";
                return;
            } else if (response.status === 403) {
                alert("You don't have sufficient permissions to perform this action.");
                return;
            } else {
                return response.text().then(errorText => {
                    throw new Error(`Failed to generate PDF: ${errorText}`);
                });
            }
        }
        return response.blob();
    })
    .then(blob => {
        if (blob) {
            // Create a URL for the blob and open it in a new tab
            const blobUrl = window.URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            
            // Clean up the blob URL after a short delay
            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
            }, 1000);
            
            showInfoMessage('PDF generated successfully!');
        }
    })
    .catch(error => {
        console.error('Error generating PDF:', error);
        showErrorMessage(`Failed to generate PDF: ${error.message}`);
    })
    .finally(() => {
        pdfBtn.disabled = false;
        pdfBtn.innerHTML = '<i class="fa fa-file-pdf-o"></i> Generate PDF';
    });
}

// Helper function to show info message
function showInfoMessage(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-info alert-dismissible fade show';
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.maxWidth = '400px';
    alertDiv.innerHTML = `
        <i class="fa fa-info-circle"></i> ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;
    document.body.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

// Helper function to show error message  
function showErrorMessage(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-warning alert-dismissible fade show';
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.maxWidth = '400px';
    alertDiv.innerHTML = `
        <i class="fa fa-exclamation-triangle"></i> ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;
    document.body.appendChild(alertDiv);
    
    // Auto remove after 7 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 7000);
}

// Helper functions for loading state
function showLoadingState() {
    const mainContent = document.querySelector('.right_col');
    if (mainContent) {
        mainContent.style.opacity = '0.5';
        mainContent.style.pointerEvents = 'none';
    }
    
    // Show loading overlay
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingOverlay';
    loadingDiv.style.position = 'fixed';
    loadingDiv.style.top = '50%';
    loadingDiv.style.left = '50%';
    loadingDiv.style.transform = 'translate(-50%, -50%)';
    loadingDiv.style.backgroundColor = 'white';
    loadingDiv.style.padding = '20px';
    loadingDiv.style.borderRadius = '8px';
    loadingDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    loadingDiv.style.zIndex = '9999';
    loadingDiv.innerHTML = `
        <div class="text-center">
            <i class="fa fa-spinner fa-spin fa-2x"></i>
            <p class="mt-2">Loading invoice data...</p>
        </div>
    `;
    document.body.appendChild(loadingDiv);
}

function hideLoadingState() {
    const mainContent = document.querySelector('.right_col');
    if (mainContent) {
        mainContent.style.opacity = '1';
        mainContent.style.pointerEvents = 'auto';
    }
    
    const loadingDiv = document.getElementById('loadingOverlay');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// Utility function to format currency
function formatCurrency(amount) {
    return '฿ ' + parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Utility function to format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}