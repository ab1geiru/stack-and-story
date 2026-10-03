// Small line icons drawn for this project. All are decorative unless given a label by their parent.
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export function PenIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12.8 3.7l3.5 3.5L7.5 16H4v-3.5l8.8-8.8z" />
      <path d="M11 5.5l3.5 3.5" />
    </svg>
  );
}

export function ArrowLeftIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M16 10H4.5M9 5l-5 5 5 5" />
    </svg>
  );
}

export function CommentIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 4.5h12a1 1 0 011 1v7.5a1 1 0 01-1 1H9l-4 3v-3H4a1 1 0 01-1-1V5.5a1 1 0 011-1z" />
    </svg>
  );
}

export function TrashIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6h12M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6M8.7 9v4M11.3 9v4" />
    </svg>
  );
}

export function MoreVerticalIcon(props) {
  return (
    <svg {...base} {...props} fill="currentColor" stroke="none">
      <circle cx="10" cy="4" r="1.6" />
      <circle cx="10" cy="10" r="1.6" />
      <circle cx="10" cy="16" r="1.6" />
    </svg>
  );
}

export function SearchIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="8.5" cy="8.5" r="5" />
      <path d="M12.3 12.3L16.5 16.5" />
    </svg>
  );
}

export function SignOutIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8 4H5a1 1 0 00-1 1v10a1 1 0 001 1h3M12 6.5L15.5 10 12 13.5M15.5 10H8" />
    </svg>
  );
}

export function AlertIcon(props) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v4.5M10 13.6v.1" />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  );
}

export function ShieldIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M10 3l5.5 2v4.5c0 3.3-2.3 5.9-5.5 7.5-3.2-1.6-5.5-4.2-5.5-7.5V5L10 3z" />
      <path d="M7.6 10l1.7 1.7 3.2-3.4" />
    </svg>
  );
}

export function CloseIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

export function ArrowRightIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 10h11.5M11 5l5 5-5 5" />
    </svg>
  );
}

export function SunIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 1.5v1.6M10 16.9v1.6M1.5 10h1.6M16.9 10h1.6M4 4l1.1 1.1M14.9 14.9L16 16M4 16l1.1-1.1M14.9 5.1L16 4" />
    </svg>
  );
}

export function MoonIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M16.4 12.3A7.1 7.1 0 017.7 3.6 7.2 7.2 0 1016.4 12.3z" />
    </svg>
  );
}

export function EyeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" />
      <circle cx="10" cy="10" r="2" />
    </svg>
  );
}
