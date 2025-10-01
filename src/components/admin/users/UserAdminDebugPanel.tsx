
import React from "react";

interface UserAdminDebugPanelProps {
  session: any;
  profile: any;
  users: any[];
}

// A simple collapsible debug panel showing current session, profile, and users
const UserAdminDebugPanel: React.FC<UserAdminDebugPanelProps> = ({
  session,
  profile,
  users,
}) => {
  if (!session && !profile && (!users || users.length === 0)) return null;

  return (
    <details className="mb-4 shadow bg-gray-50 border rounded p-4 text-xs max-w-full">
      <summary className="font-medium text-slate-700 cursor-pointer pb-2">
        Debug Info: Session, Profile & DB Users
      </summary>
      <div className="flex flex-col space-y-3 max-w-full overflow-x-auto">
        <div>
          <span className="font-bold">Auth Session:</span>
          <pre className="bg-slate-100 rounded p-2 overflow-auto max-w-full">{JSON.stringify(session, null, 2)}</pre>
        </div>
        <div>
          <span className="font-bold">Profile (current):</span>
          <pre className="bg-slate-100 rounded p-2 overflow-auto max-w-full">{JSON.stringify(profile, null, 2)}</pre>
        </div>
        <div>
          <span className="font-bold">Fetched Users:</span>
          <pre className="bg-slate-100 rounded p-2 overflow-auto max-w-full">{JSON.stringify(users, null, 2)}</pre>
        </div>
      </div>
    </details>
  );
};

export default UserAdminDebugPanel;
