# Disabled Features

This document tracks features that can be controlled via the Admin Settings page.

---

## Page Discovery Feature

**Status:** Controlled via Admin Settings  
**Date Updated:** January 24, 2026  

### Description
The Page Discovery feature allows users to discover Facebook business pages by industry keywords and location. It uses the Apify actor to fetch page data.

### How to Enable/Disable

1. Log in as an **Admin** user
2. Navigate to the **Admin Dashboard**
3. Click on **Settings** in the sidebar (under the "System" section)
4. Find the **Page Discovery** toggle
5. Click the toggle to enable or disable the feature

### Technical Details

The feature is controlled by the `page_discovery` flag stored in:
- **Config file:** `/config/feature-flags.json`
- **API endpoint:** `/api/settings/features`

When disabled:
- The API route `/api/pages/discovery` returns a 503 error
- The "Find Pages" / "Discovery Engine" menu items are hidden from sidebars
- Page Discovery entries in Search History are filtered out

### Files Involved

| File | Purpose |
|------|---------|
| `/config/feature-flags.json` | Stores the feature flag values |
| `/app/api/settings/features/route.ts` | API to read/write feature flags |
| `/app/api/pages/discovery/route.ts` | Page Discovery API (checks flag) |
| `/components/admin/AdminSettings.tsx` | Settings UI component |
| `/components/UserSidebar.tsx` | User sidebar (dynamic menu) |
| `/components/AdminSidebar.tsx` | Admin sidebar (dynamic menu) |
| `/components/SearchHistory.tsx` | History display (filters disabled features) |
| `/utils/useFeatureFlags.ts` | React hook for feature flag access |

### Components Preserved
- `/components/PageDiscovery.tsx` - Full component intact
- `/components/modals/PagePreviewModal.tsx` - Preview modal intact
- Dashboard `renderContent()` cases for the 'pages' and 'pagediscovery' tabs remain in place
