# Outreach Workspace frontend

React/Vite UI for GET Logistics Outreach Workspace. See the [project README](../README.md) for database setup, bootstrap, and deployment guidance.

Requires Node.js 24.x. From the repository root:

~~~powershell
npm.cmd ci --prefix client
npm.cmd --prefix client run dev
~~~

Start the API separately with npm.cmd run dev. Vite proxies API requests to the local backend. The production client is served by Express.

~~~powershell
npm.cmd --prefix client run lint
npm.cmd --prefix client run build
~~~

VITE_* variables are public build-time values. Never put keys, database URIs, or authentication secrets in them. Inbox and preview actions do not send email. The theme toggle stores a light/dark preference in browser storage.
