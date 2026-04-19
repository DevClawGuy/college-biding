import type { FC } from 'react';

// HouseRush logo — house outline with lightning bolt on indigo background
interface LogoProps {
  size?: number;
}

const Logo: FC<LogoProps> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="20" fill="#00d4b4" />
    <path
      d="M50 10 L88 38 L82 38 L82 88 L18 88 L18 38 L12 38 Z"
      fill="none"
      stroke="white"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    <g transform="translate(50,52) scale(2.3) translate(-12,-12)">
      <path
        d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"
        fill="none"
        stroke="white"
        strokeWidth="1.05"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M22 10v6"
        stroke="white"
        strokeWidth="1.05"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"
        stroke="white"
        strokeWidth="1.05"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  </svg>
);

export default Logo;
