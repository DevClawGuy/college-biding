import { FC } from 'react';

interface LogoProps {
  size?: number;
}

const Logo: FC<LogoProps> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="20" fill="#4F46E5" />
    <path
      d="M50 10 L88 38 L82 38 L82 88 L18 88 L18 38 L12 38 Z"
      fill="none"
      stroke="white"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    <path
      d="M58 22 L42 52 L53 52 L38 80 L64 46 L52 46 Z"
      fill="white"
    />
  </svg>
);

export default Logo;
