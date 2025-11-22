# 🎯 Phase 2A+2B Integration Guide

## ✅ Features Built

### **Phase 2A: Chat Integration** ✅
- `/repos` command - Browse and select repositories
- `/deploy` command - Deploy to Vercel
- `/help` command - Show available commands
- `/clear` command - Clear chat history
- Keyboard shortcuts (Ctrl+R, Ctrl+D)
- Command parser library

### **Phase 2B: One-Click Deploy** ✅
- Vercel API integration
- Deploy button component
- Real-time deployment status tracking
- Deployment logs display
- Success/error handling

---

## 📦 Files Created

```
/src/lib/chat-commands.ts                   - Command parser library
/src/components/chat/CommandHandler.tsx     - Command execution handler
/src/components/chat/DeployButton.tsx       - Deploy trigger button
/src/components/chat/DeployDialog.tsx       - Deploy status dialog
/app/api/vercel/deploy/route.ts             - Vercel deployment API
/.env.example                                - Updated with Vercel config
```

---

## 🔧 Integration Steps

### **Step 1: Add CommandHandler to Your Chat Interface**

Find your main chat component (likely in `/src/components/chat/` or `/app/chat/`):

```tsx
// Example: src/components/ChatInterface.tsx or similar
import { CommandHandler, useCommandHandler } from '@/components/chat/CommandHandler';
import { CommitButton } from '@/components/chat/CommitButton';
import { DeployButton } from '@/components/chat/DeployButton';

export function ChatInterface() {
  const {
    showRepoSelector,
    setShowRepoSelector,
    showDeployDialog,
    setShowDeployDialog,
    executeCommand,
  } = useCommandHandler();

  const handleSendMessage = (message: string) => {
    // Check if message is a command
    const commandResult = executeCommand(message);
    
    if (commandResult === true) {
      // Command executed successfully, don't send as regular message
      return;
    } else if (typeof commandResult === 'string') {
      // Command returned text (e.g., help text, error)
      // Display in chat as system message
      addSystemMessage(commandResult);
      return;
    }
    
    // Not a command, send as regular message
    sendMessageToAI(message);
  };

  return (
    <div className="chat-interface">
      {/* Your existing chat UI */}
      
      {/* Add CommandHandler for dialogs and shortcuts */}
      <CommandHandler 
        onCommandExecuted={(cmd) => console.log('Executed:', cmd)}
      />
      
      {/* Your message list */}
      {messages.map(msg => (
        <div key={msg.id}>
          {/* Render message */}
          
          {/* Add CommitButton if message contains code changes */}
          {msg.hasCodeChanges && (
            <CommitButton
              files={msg.files}
              suggestedMessage={msg.commitMessage}
            />
          )}
          
          {/* Add DeployButton after successful commits */}
          {msg.commitSuccess && (
            <DeployButton variant="success" />
          )}
        </div>
      ))}
    </div>
  );
}
```

---

### **Step 2: Add Keyboard Shortcut Support**

The `CommandHandler` component automatically handles keyboard shortcuts:
- **Ctrl+R** (Windows/Linux) or **Cmd+R** (Mac) - Open repository selector
- **Ctrl+D** (Windows/Linux) or **Cmd+D** (Mac) - Open deploy dialog

No additional code needed! Just include `<CommandHandler />` in your component.

---

### **Step 3: Add Command Support to Message Input**

```tsx
// In your chat input component
import { parseCommand } from '@/lib/chat-commands';

function ChatInput({ onSend }: { onSend: (msg: string) => void }) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (!input.trim()) return;
    
    // Let parent handle command logic
    onSend(input);
    setInput('');
  };

  // Add command autocomplete (optional)
  const showCommandSuggestions = input.startsWith('/');
  const commands = ['/repos', '/deploy', '/help', '/clear'];

  return (
    <div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Type a message or /help for commands..."
      />
      
      {/* Command autocomplete dropdown (optional) */}
      {showCommandSuggestions && (
        <div className="command-suggestions">
          {commands
            .filter(cmd => cmd.startsWith(input.toLowerCase()))
            .map(cmd => (
              <button key={cmd} onClick={() => setInput(cmd)}>
                {cmd}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
```

---

### **Step 4: Display System Messages for Commands**

```tsx
// Add a helper to display command responses in chat
function addSystemMessage(text: string) {
  return {
    id: Date.now(),
    role: 'system',
    content: text,
    timestamp: new Date(),
    isCommand: true,
  };
}

// In your message renderer
function MessageRenderer({ message }) {
  if (message.isCommand) {
    return (
      <div className="system-message bg-gray-800/50 border border-gray-700 rounded-lg p-4 my-2">
        <pre className="text-sm text-gray-300 whitespace-pre-wrap">
          {message.content}
        </pre>
      </div>
    );
  }
  
  // Regular message rendering
  return <div>{message.content}</div>;
}
```

---

### **Step 5: Configure Vercel API Token**

Add to your `.env.local` file:

```bash
# Get from: https://vercel.com/account/tokens
VERCEL_API_TOKEN=your_vercel_api_token_here

# Optional - only if using a team
VERCEL_TEAM_ID=team_xxxxxxxxxxxxx
```

**How to get Vercel API Token:**
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: "HOLLY Deploy Access"
4. Permissions: Full Access
5. Copy token and add to `.env.local`

---

## 🎨 Usage Examples

### **Example 1: Repository Selection**

User types in chat:
```
/repos
```

Result:
- Dialog opens showing repository list
- User searches/filters
- User clicks a repo → Active repo badge appears
- Dialog closes

### **Example 2: Quick Deploy**

User types in chat:
```
/deploy
```

Result:
- Deploy dialog opens
- Shows active repository
- User clicks "Deploy Now"
- Real-time logs appear
- Success screen with live URL

### **Example 3: Commit + Deploy Workflow**

1. User: "Fix the bug in DriveIndicator"
2. HOLLY: [Shows code fix]
   - **[💾 Commit This Fix]** button appears
3. User clicks commit button
4. Commit dialog opens → User commits
5. Success! **[🚀 Deploy to Vercel]** button appears
6. User clicks deploy button
7. Deploy dialog tracks progress
8. Done! Live URL shown

---

## 🎯 Complete Integration Example

```tsx
// app/chat/page.tsx (or wherever your chat is)
'use client';

import { useState } from 'react';
import { CommandHandler, useCommandHandler } from '@/components/chat/CommandHandler';
import { CommitButton } from '@/components/chat/CommitButton';
import { DeployButton } from '@/components/chat/DeployButton';
import { useActiveRepo } from '@/hooks/useActiveRepo';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const { activeRepo } = useActiveRepo();
  const { executeCommand } = useCommandHandler();

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // Check for commands
    const commandResult = executeCommand(input);
    
    if (commandResult === true) {
      // Command handled
      setInput('');
      return;
    } else if (typeof commandResult === 'string') {
      // Command returned text
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'system',
        content: commandResult,
        isCommand: true,
      }]);
      setInput('');
      return;
    } else if (commandResult === 'CLEAR_CHAT') {
      setMessages([]);
      setInput('');
      return;
    }

    // Regular message
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      content: input,
    }]);
    setInput('');

    // Send to AI...
    // handleAIResponse();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header with active repo indicator */}
      <header className="border-b border-gray-800 p-4">
        {activeRepo && (
          <div className="text-sm text-gray-400">
            Working on: <span className="text-purple-400 font-semibold">
              {activeRepo.fullName}
            </span>
          </div>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={msg.isCommand ? 'system-msg' : 'user-msg'}>
            {msg.content}
            
            {/* Show commit button if message has code */}
            {msg.hasCode && (
              <CommitButton
                files={msg.files}
                suggestedMessage={msg.suggestedCommit}
                className="mt-2"
              />
            )}
            
            {/* Show deploy button after commit success */}
            {msg.commitSuccess && (
              <DeployButton className="mt-2" variant="success" />
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type a message or /help for commands..."
          className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg"
        />
      </div>

      {/* Command Handler (provides dialogs and shortcuts) */}
      <CommandHandler onCommandExecuted={(cmd) => console.log('Command:', cmd)} />
    </div>
  );
}
```

---

## ✅ Verification Checklist

After integration:

- [ ] `/repos` command opens repository selector
- [ ] Ctrl+R keyboard shortcut works
- [ ] Repository selection persists after refresh
- [ ] Active repo badge shows in UI
- [ ] CommitButton appears in appropriate messages
- [ ] CommitDialog shows branches and commits successfully
- [ ] `/deploy` command opens deploy dialog
- [ ] Ctrl+D keyboard shortcut works
- [ ] Deploy triggers Vercel build
- [ ] Deploy logs show in real-time
- [ ] Deploy success shows live URL
- [ ] `/help` shows command list
- [ ] `/clear` clears chat history

---

## 🐛 Troubleshooting

### **Commands not working?**
- Ensure `CommandHandler` is included in your component
- Check that `executeCommand` is being called on message send
- Verify command starts with `/` character

### **Deploy not triggering?**
- Check `VERCEL_API_TOKEN` is set in `.env.local`
- Verify token has correct permissions (Full Access)
- Check console for API errors

### **Keyboard shortcuts not working?**
- Ensure `CommandHandler` is mounted in DOM
- Check that focus is not in an input field
- Try clicking outside input first

### **Repository not persisting?**
- Check localStorage is enabled
- Verify `useActiveRepo` hook is being used
- Check browser console for Zustand errors

---

## 🚀 Next Steps

### **Optional Enhancements:**

1. **Command History** (15 min)
   - Arrow up/down to cycle through previous commands
   - Store in localStorage

2. **Command Aliases** (5 min)
   - Add more aliases: `/r` for repos, `/d` for deploy
   - Customize in `chat-commands.ts`

3. **Deploy Presets** (20 min)
   - Save deploy configurations (staging vs production)
   - Quick deploy to different environments

4. **Commit Templates** (10 min)
   - Pre-defined commit message templates
   - Auto-generate from code analysis

---

## 📚 API Reference

### **parseCommand(message: string)**
```typescript
const command = parseCommand('/repos');
// Returns: { type: 'repos', args: [], rawCommand: '/repos' }
```

### **useCommandHandler()**
```typescript
const {
  showRepoSelector,      // boolean
  setShowRepoSelector,   // (show: boolean) => void
  showDeployDialog,      // boolean
  setShowDeployDialog,   // (show: boolean) => void
  executeCommand,        // (message: string) => boolean | string
} = useCommandHandler();
```

### **executeCommand() Return Values**
- `true` - Command executed successfully
- `string` - Command returned text to display
- `'CLEAR_CHAT'` - Special signal to clear chat
- `false` - Not a command

---

## 🎉 You're Done!

Phase 2A + 2B are now fully integrated! 

Test the workflow:
1. Type `/repos` → Select a repository
2. Work on code with HOLLY
3. Click "Commit This Fix"
4. Click "Deploy to Vercel"
5. Watch it go live! 🚀

---

**Built by HOLLY** 🤖💜  
**For: Steve "Hollywood" Dorego**  
**Date: November 22, 2025**
