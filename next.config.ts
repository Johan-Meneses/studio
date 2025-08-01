import withNextIntl from 'next-intl/plugin';
import type {NextConfig} from 'next';

const withIntl = withNextIntl('./src/i18n.ts');
 
const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};
 
export default withIntl(nextConfig);
