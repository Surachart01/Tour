/**
 * Subscription Management Module
 * Handles subscription tiers, limits, and upgrades
 */

class SubscriptionManagement {
  constructor() {
    this.subscriptionData = null;
    this.usageData = null;
    this.initialized = false;
    this.plans = [
      {
        tier: "starter",
        name: "Starter",
        price: "$9.99",
        period: "month",
        features: ["Create Quotations", "Manage Bookings", "Track Payments", "Basic Reports", "Export Data", "Integrations"],
        limits: {
          users: 1,
          quotations: 100,
          bookings: 100,
          storage_gb: 1
        }
      },
      {
        tier: "pro",
        name: "Professional", 
        price: "$29.99",
        period: "month",
        features: ["All Starter Features", "Custom Reports", "API Access", "Priority Support", "Advanced Integrations"],
        limits: {
          users: 5,
          quotations: 5000,
          bookings: 5000,
          storage_gb: 5
        }
      },
      {
        tier: "business",
        name: "Business",
        price: "$99.99",
        period: "month",
        features: ["All Pro Features", "White Label", "Priority Support", "All Integrations"],
        limits: {
          users: 100,
          quotations: 250000,
          bookings: 250000,
          storage_gb: 20
        }
      },
      {
        tier: "enterprise",
        name: "Enterprise",
        price: "Custom",
        period: "pricing",
        features: ["All Business Features", "Custom Integrations", "Dedicated Support", "Advanced Analytics", "Unlimited Users"],
        limits: {
          users: Infinity,
          quotations: Infinity,
          bookings: Infinity,
          storage_gb: Infinity
        }
      }
    ];
  }

  /**
   * Initialize subscription management
   * @param {Object} subscriptionData - Subscription data from API
   * @param {Object} usageData - Usage data from API
   */
  initialize(subscriptionData, usageData) {
    this.subscriptionData = subscriptionData || {};
    this.usageData = usageData || { metrics: {} };
    this.initialized = true;
    return this;
  }

  /**
   * Get the current subscription tier
   * @returns {Object} - The current subscription plan
   */
  getCurrentPlan() {
    const currentTier = this.subscriptionData.subscription_tier || "starter";
    return this.plans.find(plan => plan.tier === currentTier) || this.plans[0];
  }

  /**
   * Get subscription plan by tier
   * @param {string} tier - The subscription tier
   * @returns {Object} - The subscription plan
   */
  getPlan(tier) {
    return this.plans.find(plan => plan.tier === tier) || null;
  }

  /**
   * Check if the current plan is a trial
   * @returns {boolean} - True if trial, false otherwise
   */
  isTrial() {
    return this.subscriptionData.subscription_status === 'trial';
  }

  /**
   * Get days remaining in trial
   * @returns {number} - Days remaining in trial, 0 if not a trial
   */
  getTrialDaysRemaining() {
    if (!this.isTrial() || !this.subscriptionData.trial_end) {
      return 0;
    }

    const trialEnd = new Date(this.subscriptionData.trial_end);
    const now = new Date();
    const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    
    return Math.max(0, daysRemaining);
  }

  /**
   * Check if a feature is available in the current subscription
   * @param {string} featureName - The feature to check
   * @returns {boolean} - True if feature is available, false otherwise
   */
  hasFeatureAccess(featureName) {
    // Check the subscriptionData.features object if available
    if (this.subscriptionData.features && this.subscriptionData.features[featureName] !== undefined) {
      return this.subscriptionData.features[featureName] === true;
    }

    // Fall back to specific feature checks in profile data
    switch(featureName) {
      case 'api_access':
        return this.subscriptionData.api_access_enabled === true;
      case 'custom_reports':
        return this.subscriptionData.custom_reports_enabled === true;
      case 'white_label':
        return this.subscriptionData.white_label_enabled === true;
      case 'priority_support':
        return this.subscriptionData.priority_support === true;
      case 'integrations':
        return this.getCurrentPlan().tier !== 'starter';
      case 'export':
        return true; // Available in all plans
      default:
        return false;
    }
  }

  /**
   * Get the usage percentage for a specific metric
   * @param {string} metric - The metric to check (users, quotations, bookings, storage_gb)
   * @returns {Object} - Usage information with current, limit, and percentage
   */
  getUsagePercentage(metric) {
    const currentPlan = this.getCurrentPlan();
    const limit = currentPlan.limits[metric];
    
    if (!limit || limit === Infinity) {
      return { current: 0, limit: 'Unlimited', percentage: 0 };
    }

    let current = 0;
    
    // Try to get from usage metrics first
    if (this.usageData.metrics && this.usageData.metrics[metric]) {
      current = this.usageData.metrics[metric].current;
    } 
    // Fall back to subscription data
    else if (this.subscriptionData.usage && this.subscriptionData.usage[metric]) {
      current = this.subscriptionData.usage[metric];
    }

    const percentage = (current / limit) * 100;
    
    return {
      current,
      limit,
      percentage: Math.min(percentage, 100)
    };
  }

  /**
   * Check if the current plan needs an upgrade for a specific usage
   * @param {string} metric - The metric to check (users, quotations, bookings, storage_gb)
   * @param {number} requiredAmount - The required amount
   * @returns {boolean} - True if upgrade needed, false otherwise
   */
  needsUpgradeFor(metric, requiredAmount) {
    const currentPlan = this.getCurrentPlan();
    const limit = currentPlan.limits[metric];
    
    if (!limit || limit === Infinity) {
      return false;
    }

    return requiredAmount > limit;
  }

  /**
   * Get recommended plan for a specific usage requirement
   * @param {string} metric - The metric to check (users, quotations, bookings, storage_gb)
   * @param {number} requiredAmount - The required amount
   * @returns {Object} - The recommended plan
   */
  getRecommendedPlan(metric, requiredAmount) {
    return this.plans.find(plan => {
      const limit = plan.limits[metric];
      if (!limit || limit === Infinity) {
        return true;
      }
      return requiredAmount <= limit;
    }) || this.plans[this.plans.length - 1]; // Return enterprise if nothing fits
  }

  /**
   * Render subscription plans to a container element
   * @param {string} containerId - The ID of the container element
   */
  renderSubscriptionPlans(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentPlan = this.getCurrentPlan();
    container.innerHTML = "";

    this.plans.forEach(plan => {
      const isCurrent = plan.tier === currentPlan.tier;
      
      const planElement = document.createElement("div");
      planElement.className = "col-md-3 mb-3";
      planElement.innerHTML = `
        <div class="card h-100 ${isCurrent ? 'border-primary' : ''}">
          <div class="card-body text-center">
            <h5 class="card-title">${plan.name} ${isCurrent ? '<span class="badge badge-primary">Current</span>' : ''}</h5>
            <h3 class="text-primary">${plan.price}<small class="text-muted"> /${plan.period}</small></h3>
            <p class="text-muted small">
              ${plan.limits.users === Infinity ? 'Unlimited users' : plan.limits.users + ' users'}, 
              ${plan.limits.storage_gb === Infinity ? 'Unlimited storage' : plan.limits.storage_gb + 'GB storage'}
            </p>
            <ul class="list-unstyled mt-3 mb-4 text-left">
              ${plan.features.map(feature => `<li><i class="fa fa-check text-success"></i> ${feature}</li>`).join('')}
            </ul>
            ${isCurrent ? 
              '<button class="btn btn-outline-secondary btn-sm" disabled>Current Plan</button>' : 
              `<button class="btn btn-outline-primary btn-sm" onclick="SubscriptionManagement.upgradeTo('${plan.tier}')">
                ${plan.tier === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
              </button>`
            }
          </div>
        </div>
      `;
      container.appendChild(planElement);
    });
  }

  /**
   * Show trial countdown if applicable
   * @param {string} containerId - The ID of the container element 
   */
  showTrialCountdown(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!this.isTrial()) {
      container.style.display = 'none';
      return;
    }

    const daysLeft = this.getTrialDaysRemaining();
    if (daysLeft <= 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    container.className = `trial-banner ${daysLeft <= 3 ? 'urgent' : ''}`;
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center p-3 mb-3 rounded" 
           style="background-color: ${daysLeft <= 3 ? '#fff3cd' : '#d1ecf1'}; 
                  border: 1px solid ${daysLeft <= 3 ? '#ffeaa7' : '#bee5eb'};">
        <span><i class="fa fa-clock-o mr-2"></i> ${daysLeft} days left in trial</span>
        <button class="btn btn-sm ${daysLeft <= 3 ? 'btn-warning' : 'btn-info'}" 
                onclick="SubscriptionManagement.upgradeTo('pro')">
          Upgrade Now
        </button>
      </div>
    `;
  }

  /**
   * Show usage indicators for metrics
   * @param {Object} config - Configuration with metric IDs
   */
  showUsageIndicators(config) {
    const metrics = ['users', 'quotations', 'bookings', 'storage_gb'];
    
    metrics.forEach(metric => {
      const countId = config[`${metric}Count`];
      const limitId = config[`${metric}Limit`];
      const barId = config[`${metric}Bar`];
      
      if (!countId || !limitId || !barId) return;
      
      const usage = this.getUsagePercentage(metric);
      
      const countElement = document.getElementById(countId);
      const limitElement = document.getElementById(limitId);
      const barElement = document.getElementById(barId);
      
      if (countElement) {
        countElement.textContent = usage.current;
      }
      
      if (limitElement) {
        limitElement.textContent = `of ${usage.limit}`;
      }
      
      if (barElement) {
        barElement.style.width = `${usage.percentage}%`;
        
        // Update color based on usage
        barElement.className = "progress-bar";
        if (usage.percentage >= 90) {
          barElement.classList.add("bg-danger");
        } else if (usage.percentage >= 75) {
          barElement.classList.add("bg-warning");
        } else {
          barElement.classList.add("bg-success");
        }
      }
    });
  }

  /**
   * Upgrade to a specific plan
   * @param {string} planTier - The plan tier to upgrade to
   */
  upgradeTo(planTier) {
    const plan = this.getPlan(planTier);
    
    if (!plan) {
      console.error(`Invalid plan tier: ${planTier}`);
      return;
    }
    
    if (planTier === 'enterprise') {
      window.open('mailto:sales@example.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }
    
    // Show upgrade modal
    this.showUpgradeModal(plan);
  }

  /**
   * Show upgrade modal for a plan
   * @param {Object} plan - The plan to upgrade to
   */
  showUpgradeModal(plan) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.setAttribute('id', 'upgradeModal');
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'upgradeModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    
    modal.innerHTML = `
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="upgradeModalLabel">Upgrade to ${plan.name}</h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <p>Upgrade to our ${plan.name} plan to unlock more features and increase your usage limits:</p>
            <ul>
              <li><strong>Users:</strong> ${plan.limits.users}</li>
              <li><strong>Quotations:</strong> ${plan.limits.quotations.toLocaleString()}</li>
              <li><strong>Bookings:</strong> ${plan.limits.bookings.toLocaleString()}</li>
              <li><strong>Storage:</strong> ${plan.limits.storage_gb}GB</li>
            </ul>
            <p>Price: ${plan.price} per ${plan.period}</p>
            <p class="text-muted small">You'll be redirected to our payment processor to complete your subscription.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="SubscriptionManagement.processUpgrade('${plan.tier}')">
              Continue to Payment
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    $('#upgradeModal').modal('show');
    
    $('#upgradeModal').on('hidden.bs.modal', function() {
      document.body.removeChild(modal);
    });
  }

  /**
   * Process upgrade to a specific plan
   * @param {string} planTier - The plan tier to upgrade to
   */
  async processUpgrade(planTier) {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const userId = localStorage.getItem("userId") || localStorage.getItem("user_id");
      if (!userId) throw new Error("User ID not found");

      // Show loading state
      const button = document.querySelector('#upgradeModal .btn-primary');
      button.disabled = true;
      button.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Processing...';

      const response = await fetch(`${Endpoint}/api/v1/user-profiles/${userId}/subscription/upgrade`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: planTier
        })
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Endpoint not implemented yet, show message
          alert("Subscription upgrade is coming soon. Please check back later.");
          $('#upgradeModal').modal('hide');
          return;
        }
        
        const error = await response.json();
        throw new Error(error.message || `Failed to upgrade: ${response.status}`);
      }

      const result = await response.json();
      
      // If result has a payment URL, redirect to it
      if (result.payment_url) {
        window.location.href = result.payment_url;
        return;
      }
      
      // Otherwise show success message
      alert(`Subscription upgraded to ${planTier}!`);
      $('#upgradeModal').modal('hide');
      
      // Reload the page to reflect changes
      window.location.reload();
      
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      alert(`Failed to upgrade subscription: ${error.message}`);
      
      // Reset button state
      const button = document.querySelector('#upgradeModal .btn-primary');
      button.disabled = false;
      button.innerHTML = 'Continue to Payment';
    }
  }
}

// Create a global instance
window.SubscriptionManagement = new SubscriptionManagement(); 