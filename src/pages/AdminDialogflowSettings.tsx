import React from 'react';
import { DialogflowSettings } from '@/components/admin/DialogflowSettings';

export default function AdminDialogflowSettings() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">AI Chat Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure Dialogflow CX integration for the chatbot
        </p>
      </div>
      
      <DialogflowSettings />
    </div>
  );
}
