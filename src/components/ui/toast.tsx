'use client';
import * as React from 'react';
export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}
export const useToast = () => {
  const toast = ({ title, description, variant = 'default' }: ToastProps) => {
    console.log(`Toast [${variant}]:`, title, description);
  };
  return { toast };
};
export const Toaster = () => null;
