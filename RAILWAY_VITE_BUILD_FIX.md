# Railway Vite Build Fix

The Railway build failed with `sh: 1: vite: not found` because Vite is a frontend `devDependency`, and production-oriented npm installs can omit dev dependencies.

The root `package.json` now explicitly installs build-time dev dependencies for both backend and frontend:

```json
"install:all": "npm ci --include=dev --prefix backend && npm ci --include=dev --prefix frontend"
```

No database migration is required. Redeploy after pushing this file.
