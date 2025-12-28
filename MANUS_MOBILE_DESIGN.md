# Manus Mobile Design Patterns

## Key Principles for HOLLY Mobile

### 1. **Minimal Header**
- No complex buttons in header on mobile
- Just hamburger menu + essential actions
- Clean, uncluttered top area

### 2. **Full-Screen Chat Area**
- Messages take up maximum space
- No sidebar visible (slides in when needed)
- Input field at bottom, always accessible

### 3. **Bottom Input Bar**
- Simple input field
- Minimal action buttons (attach, send)
- No complex toolbars or multiple rows

### 4. **Sidebar**
- Hidden by default on mobile
- Slides in from left when hamburger clicked
- Covers full screen when open
- Easy to dismiss

### 5. **Typography & Spacing**
- Larger touch targets (min 44px)
- Adequate padding for readability
- No tiny buttons or cramped UI

### 6. **What to Remove on Mobile**
- Complex header buttons (Collaborate, Share, Files, Export, Clear, Read)
- Action buttons in chat area (Create, Generate, Analyze)
- Brain state indicator
- Duplicate functionality

### 7. **What to Keep on Mobile**
- Hamburger menu (access sidebar)
- Message input field
- Send button
- Basic file attach
- Voice button (if essential)

## Implementation Plan

1. **Hide header buttons on mobile** - Use `hidden lg:flex` pattern
2. **Simplify input area** - Remove action buttons, keep only essentials
3. **Ensure proper spacing** - Add mobile-specific padding
4. **Test on actual mobile viewport** - Verify layout works at 375px width
