import React from "react";
import { Dialog } from "../../pages/operations/ui";
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}) =>
  isOpen ? (
    <Dialog title={title} onClose={onClose}>
      {subtitle && <p className="ops-help">{subtitle}</p>}
      {children}
    </Dialog>
  ) : null;
