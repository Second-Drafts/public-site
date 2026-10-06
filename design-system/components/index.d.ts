import * as React from "react";

/** Buttons. One `primary` or `accent` per view. */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = ink fill · accent = marker-blue fill, the one move forward (Publish, Send) · secondary = outlined · quiet = text only. Default "primary". */
  variant?: "primary" | "accent" | "secondary" | "quiet";
  /** Default "md". */
  size?: "sm" | "md" | "lg";
  /** A 18px icon node, shown before the label. */
  icon?: React.ReactNode;
  children: React.ReactNode;
}
export declare function Button(props: ButtonProps): React.ReactElement;

/** A hand-drawn marker annotation over inline text. */
export interface MarkProps extends React.HTMLAttributes<HTMLElement> {
  /** highlight = yellow (<mark>) · underline = green · circle = pink · strike = red pen (<del>) · check = orange tick after the text. Default "highlight". */
  kind?: "highlight" | "underline" | "circle" | "strike" | "check";
  children: React.ReactNode;
}
export declare function Mark(props: MarkProps): React.ReactElement;

/** Workflow status of a piece of writing, as a pill with a word. */
export interface StatusTagProps {
  /** Default "draft". */
  status: "draft" | "review" | "approved" | "published" | "blocked";
  /** Overrides the default word (keep it one or two words). */
  children?: React.ReactNode;
  className?: string;
}
export declare function StatusTag(props: StatusTagProps): React.ReactElement;

/** A labelled text input or textarea in the prose face. */
export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
  /** Helper text under the field. */
  hint?: React.ReactNode;
  /** Error message; replaces the hint and turns the field red-pen. Say what is wrong and how to fix it. */
  error?: React.ReactNode;
  /** Render a <textarea>. */
  multiline?: boolean;
  rows?: number;
}
export declare function TextField(props: TextFieldProps): React.ReactElement;

/** A comment in the margin, from a teammate or an agent. */
export interface MarginNoteProps {
  author: React.ReactNode;
  /** The collaborator's marker. Default "pink". */
  color?: "yellow" | "pink" | "blue" | "green" | "orange";
  /** Marks the author as an AI agent. */
  agent?: boolean;
  /** Relative time, e.g. "2m ago". */
  time?: React.ReactNode;
  /** The passage being discussed, shown highlighted. */
  quote?: React.ReactNode;
  /** Quiet buttons: Reply, Resolve, Accept. */
  actions?: React.ReactNode;
  resolved?: boolean;
  children: React.ReactNode;
  className?: string;
}
export declare function MarginNote(props: MarginNoteProps): React.ReactElement;
