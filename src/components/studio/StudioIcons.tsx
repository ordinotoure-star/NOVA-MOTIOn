import type { SVGProps } from 'react';

export type StudioIconProps = SVGProps<SVGSVGElement>;

export function NovaBrandMark({ className = 'w-7 h-7', ...props }: StudioIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="8"
        fill="#0E1629"
        stroke="#243B63"
        strokeWidth="1.5"
      />
      <path
        d="M9 11.5C9 10.1193 10.1193 9 11.5 9H20.5C21.8807 9 23 10.1193 23 11.5V20.5C23 21.8807 21.8807 23 20.5 23H11.5C10.1193 23 9 21.8807 9 20.5V11.5Z"
        fill="#3978FF"
        fillOpacity="0.14"
        stroke="#3978FF"
        strokeWidth="1.5"
      />
      <path
        d="M14 12.75L20 16L14 19.25V12.75Z"
        fill="#A78BFA"
        stroke="#F4F7FB"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="11.5" cy="11.5" r="1" fill="#3978FF" />
      <circle cx="20.5" cy="20.5" r="1" fill="#A78BFA" />
    </svg>
  );
}

export function IconOverview({ className = 'w-4 h-4', ...props }: StudioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <rect
        x="3"
        y="3"
        width="8"
        height="9"
        rx="2"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect x="14" y="3" width="7" height="5" rx="1.75" stroke="currentColor" strokeWidth="1.6" />
      <rect
        x="14"
        y="11"
        width="7"
        height="10"
        rx="2"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect x="3" y="15" width="8" height="6" rx="1.75" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function IconVideoEngine({ className = 'w-4 h-4', ...props }: StudioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <rect
        x="2.75"
        y="4.75"
        width="18.5"
        height="14.5"
        rx="2.75"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M6.5 4.75V8.5M17.5 4.75V8.5M6.5 15.5V19.25M17.5 15.5V19.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M10.25 9.25L15.25 12L10.25 14.75V9.25Z"
        fill="currentColor"
        fillOpacity="0.32"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconImageEngine({ className = 'w-4 h-4', ...props }: StudioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M7 3.5H5.25C4.2835 3.5 3.5 4.2835 3.5 5.25V7M17 3.5H18.75C19.7165 3.5 20.5 4.2835 20.5 5.25V7M7 20.5H5.25C4.2835 20.5 3.5 19.7165 3.5 18.75V17M17 20.5H18.75C19.7165 20.5 20.5 19.7165 20.5 18.75V17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <rect
        x="6.25"
        y="6.25"
        width="11.5"
        height="11.5"
        rx="2"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="9.75" cy="9.75" r="1.25" fill="currentColor" />
      <path
        d="M7.5 16L11 12.5L13.25 14.75L15 13L17 15.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconFilmEngine({ className = 'w-4 h-4', ...props }: StudioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M3.5 9.5H20.5V18.25C20.5 19.4926 19.4926 20.5 18.25 20.5H5.75C4.50736 20.5 3.5 19.4926 3.5 18.25V9.5Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 9.5L5.2 4.8C5.45 4.1 6.18 3.72 6.9 3.92L20.1 7.62L19.4 9.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.5 4.7L8.2 9.5M14.75 6.15L13.45 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.5 14.75H15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconEditingStudio({ className = 'w-4 h-4', ...props }: StudioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <rect
        x="3"
        y="6"
        width="18"
        height="4.5"
        rx="1.25"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="3"
        y="13.5"
        width="18"
        height="4.5"
        rx="1.25"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M12 3V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.5 3H14.5L12 5.75L9.5 3Z" fill="currentColor" />
    </svg>
  );
}

export function IconProjects({ className = 'w-4 h-4', ...props }: StudioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M3.25 6.75C3.25 5.64543 4.14543 4.75 5.25 4.75H9.6L11.4 7H18.75C19.8546 7 20.75 7.89543 20.75 9V17.25C20.75 18.3546 19.8546 19.25 18.75 19.25H5.25C4.14543 19.25 3.25 18.3546 3.25 17.25V6.75Z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M7.5 12H16.5M7.5 15.25H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconLibrary({ className = 'w-4 h-4', ...props }: StudioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <rect x="4" y="4.5" width="4" height="15" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <rect
        x="10"
        y="4.5"
        width="4"
        height="15"
        rx="1.2"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M16 5.2L19.8 4.4C20.3 4.3 20.75 4.65 20.85 5.15L22.5 18.25C22.6 18.75 22.25 19.2 21.75 19.3L18 20.1C17.5 20.2 17.05 19.85 16.95 19.35L15.3 6.25C15.2 5.75 15.55 5.3 16 5.2Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function IconHistory({ className = 'w-4 h-4', ...props }: StudioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <circle
        cx="12"
        cy="12"
        r="8.5"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M12 7.5V12.25L15.25 14.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconSubscriptions({ className = 'w-4 h-4', ...props }: StudioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <rect
        x="2.75"
        y="5.25"
        width="18.5"
        height="13.5"
        rx="2.5"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M2.75 9.75H21.25" stroke="currentColor" strokeWidth="1.6" />
      <rect x="6" y="13" width="4.5" height="2.5" rx="0.75" fill="currentColor" fillOpacity="0.5" />
      <path d="M14.5 14.25H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconSettings({ className = 'w-4 h-4', ...props }: StudioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M4 7H20M4 12H20M4 17H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="7" r="2.2" fill="#0B1221" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15.5" cy="12" r="2.2" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10.5" cy="17" r="2.2" fill="#0B1221" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function IconSupport({ className = 'w-4 h-4', ...props }: StudioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <circle
        cx="12"
        cy="12"
        r="8.5"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.2 6.2L9.5 9.5M17.8 6.2L14.5 9.5M6.2 17.8L9.5 14.5M17.8 17.8L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconAdmin({ className = 'w-4 h-4', ...props }: StudioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M12 3.25L19.25 6.25V11.75C19.25 16.35 16.1 19.75 12 21C7.9 19.75 4.75 16.35 4.75 11.75V6.25L12 3.25Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11.5" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7.75V9.25M12 13.75V15.25M8.75 11.5H9.75M14.25 11.5H15.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconOrchestrator({ className = 'w-4 h-4', ...props }: StudioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M12 3L14.25 9.75L21 12L14.25 14.25L12 21L9.75 14.25L3 12L9.75 9.75L12 3Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="18.5" cy="5.5" r="1.25" fill="currentColor" />
      <circle cx="5.5" cy="18.5" r="1" fill="currentColor" fillOpacity="0.7" />
    </svg>
  );
}

export function IconWalletCredit({ className = 'w-4 h-4', ...props }: StudioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M12 3L19.5 7.3V16.7L12 21L4.5 16.7V7.3L12 3Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 7.5V16.5M8.5 9.75L15.5 14.25M15.5 9.75L8.5 14.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconNotifications({ className = 'w-4 h-4', ...props }: StudioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M6.5 15.75V10.5C6.5 7.46243 8.96243 5 12 5C15.0376 5 17.5 7.46243 17.5 10.5V15.75L19.25 17.5H4.75L6.5 15.75Z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 19.5C10.5 20.35 11.2 20.75 12 20.75C12.8 20.75 13.5 20.35 14 19.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconLogout({ className = 'w-4 h-4', ...props }: StudioIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M10 4.5H6.25C5.2835 4.5 4.5 5.2835 4.5 6.25V17.75C4.5 18.7165 5.2835 19.5 6.25 19.5H10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M14.5 8.5L19 12L14.5 15.5M19 12H9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
