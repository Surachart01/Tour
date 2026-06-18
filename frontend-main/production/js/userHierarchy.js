/**
 * User Hierarchy System for SaaS User Profile Integration
 * Handles the 4-tier user hierarchy:
 * - Super Admin (Platform Owner)
 * - Primary Admin (Billing Owner/Customer)
 * - Sub-Admin (Additional Admin Users)
 * - Agent (End Users/Clients)
 */

class UserHierarchy {
  constructor() {
    this.currentUser = null;
    this.userProfile = null;
    this.organizationUsers = [];
    this.initialized = false;
  }

  /**
   * Initialize the user hierarchy system
   * @param {Object} currentUser - The current logged in user
   * @param {Object} userProfile - The user's profile data
   */
  async initialize(currentUser, userProfile) {
    this.currentUser = currentUser;
    this.userProfile = userProfile;
    
    // If the user is a primary admin or super admin, load organization users
    if (this.isPrimaryAdmin() || this.isSuperAdmin()) {
      await this.loadOrganizationUsers();
    }
    
    this.initialized = true;
    return this;
  }

  /**
   * Load users in the organization
   */
  async loadOrganizationUsers() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return [];

      const orgId = this.getOrganizationId();
      if (!orgId) return [];

      const response = await fetch(`${Endpoint}/api/v1/users/organization/${orgId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log("Organization users endpoint not found, falling back to empty data");
          this.organizationUsers = [];
          return [];
        }
        throw new Error(`Failed to fetch organization users: ${response.status}`);
      }

      const data = await response.json();
      this.organizationUsers = data.users || [];
      return this.organizationUsers;
    } catch (error) {
      console.error("Error loading organization users:", error);
      this.organizationUsers = [];
      return [];
    }
  }

  /**
   * Get the organization ID for the current user
   */
  getOrganizationId() {
    // For super admin, organization ID is their own user ID
    if (this.isSuperAdmin()) {
      return this.currentUser.id;
    }
    
    // For primary admin, organization ID is their own user ID
    if (this.isPrimaryAdmin()) {
      return this.currentUser.id;
    }
    
    // For sub-admin or agent, organization ID comes from parent user
    return this.currentUser.organization_id || this.currentUser.parent_user_id;
  }

  /**
   * Check if user is a super admin
   * @param {Object} user - Optional user object, defaults to current user
   */
  isSuperAdmin(user = this.currentUser) {
    return user && (
      user.is_super_admin === true ||
      user.user_type === 'super_admin'
    );
  }

  /**
   * Check if user is a primary admin
   * @param {Object} user - Optional user object, defaults to current user
   */
  isPrimaryAdmin(user = this.currentUser) {
    return user && (
      user.is_primary_admin === true ||
      user.user_type === 'primary_admin'
    );
  }

  /**
   * Check if user is a sub-admin
   * @param {Object} user - Optional user object, defaults to current user
   */
  isSubAdmin(user = this.currentUser) {
    return user && (
      user.user_type === 'sub_admin' && 
      (user.parent_user_id || user.organization_id)
    );
  }

  /**
   * Check if user is an agent
   * @param {Object} user - Optional user object, defaults to current user
   */
  isAgent(user = this.currentUser) {
    return user && (
      (user.user_type === 'agent' || !user.user_type) && 
      (user.parent_user_id || user.organization_id)
    );
  }

  /**
   * Check if the user can create other users
   * @param {Object} user - Optional user object, defaults to current user
   */
  canCreateUsers(user = this.currentUser) {
    return user && (
      this.isSuperAdmin(user) || 
      this.isPrimaryAdmin(user) ||
      user.can_create_users === true
    );
  }

  /**
   * Check if the user can view analytics
   * @param {Object} user - Optional user object, defaults to current user
   */
  canViewAnalytics(user = this.currentUser) {
    return user && (
      this.isSuperAdmin(user) || 
      this.isPrimaryAdmin(user) ||
      user.can_view_analytics === true
    );
  }

  /**
   * Get the user's role in the hierarchy
   * @param {Object} user - Optional user object, defaults to current user
   */
  getUserRole(user = this.currentUser) {
    if (this.isSuperAdmin(user)) return 'Super Admin';
    if (this.isPrimaryAdmin(user)) return 'Primary Admin';
    if (this.isSubAdmin(user)) return 'Sub Admin';
    if (this.isAgent(user)) return 'Agent';
    return 'User';
  }

  /**
   * Create a new sub-user under the current user
   * @param {Object} userData - The user data
   */
  async createSubUser(userData) {
    try {
      if (!this.canCreateUsers()) {
        throw new Error("You don't have permission to create users");
      }

      // Check user limit first
      const limitCheck = await this.checkUserLimit();
      if (!limitCheck.canAddMore) {
        throw new Error(`You have reached your user limit of ${limitCheck.limit}. Please upgrade your plan to add more users.`);
      }

      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const payload = {
        ...userData,
        parent_user_id: this.currentUser.id,
        organization_id: this.getOrganizationId()
      };

      const response = await fetch(`${Endpoint}/api/v1/users/sub-user`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to create user: ${response.status}`);
      }

      const result = await response.json();
      
      // Refresh organization users
      await this.loadOrganizationUsers();
      
      return result;
    } catch (error) {
      console.error("Error creating sub-user:", error);
      throw error;
    }
  }

  /**
   * Check if the organization can add more users
   */
  async checkUserLimit() {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const orgId = this.getOrganizationId();
      if (!orgId) throw new Error("Organization ID not found");

      const response = await fetch(`${Endpoint}/api/v1/user-profiles/organization/${orgId}/user-count`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Endpoint not implemented yet, assume no limits for now
          return { 
            current_users: this.organizationUsers.length, 
            user_limit: Infinity,
            can_add_more: true
          };
        }
        throw new Error(`Failed to check user limits: ${response.status}`);
      }

      const data = await response.json();
      return {
        current: data.current_users,
        limit: data.user_limit,
        canAddMore: data.current_users < data.user_limit,
        tier: data.subscription_tier
      };
    } catch (error) {
      console.error("Error checking user limit:", error);
      // Default to allowing user creation if check fails
      return { 
        current: this.organizationUsers.length, 
        limit: Infinity,
        canAddMore: true
      };
    }
  }
}

// Create a global instance
window.UserHierarchy = new UserHierarchy(); 