# Common JavaScript Files

This directory contains common JavaScript files that can be reused across multiple pages in the application.

## Role Permissions

`role-permissions.js` provides standardized role-based access control for all pages.

### How to use:

1. Include the script in your HTML file:
   ```html
   <script src="js/common/role-permissions.js"></script>
   ```

2. The script will automatically handle:
   - Control panel visibility based on user role (shown only for admin and superadmin)
   - Other role-specific UI configurations

3. Available helper functions:

   - `hasAdminAccess()` - Check if user has admin access (admin or superadmin)
   ```javascript
   if (hasAdminAccess()) {
     // Show admin-only content
   }
   ```

   - `configureElementVisibility(elementId, allowedRoles)` - Show/hide elements based on roles
   ```javascript
   // Show element only for admin and superadmin
   configureElementVisibility('adminOnlyFeature', ['admin', 'superadmin']);
   
   // Show element only for specific roles
   configureElementVisibility('specialFeature', ['admin', 'superadmin', 'manager']);
   ```

### How to maintain:

- Add new common role-based behavior in `configureUIForRole()` function
- Keep helper functions simple and well-documented
- If adding new helper functions, document them in this README 