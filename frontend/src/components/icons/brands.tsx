import React from "react";

type IconProps = {
  size?: number;
  className?: string;
};

export function XLogoIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M18.9 2H22l-6.78 7.74L23 22h-6.16l-4.82-6.36L6.44 22H3.33l7.25-8.28L1 2h6.3l4.36 5.77L18.9 2Zm-1.08 18.16h1.72L7.24 3.74H5.39l12.43 16.42Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function GoogleGIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 10.2v3.6h5.02c-.22 1.22-1.38 3.58-5.02 3.58-3.02 0-5.48-2.5-5.48-5.58S8.98 6.62 12 6.62c1.72 0 2.87.74 3.52 1.38l2.4-2.3C16.44 4.26 14.4 3.2 12 3.2 7.9 3.2 4.6 6.52 4.6 10.8S7.9 18.4 12 18.4c4.6 0 7.64-3.22 7.64-7.74 0-.52-.06-.92-.12-1.32H12Z"
        fill="currentColor"
      />
    </svg>
  );
}
