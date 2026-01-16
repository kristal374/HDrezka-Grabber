import { SiteType } from '@/lib/types';
import { HDrezkaLoader } from '@/service-worker/site-loader/hdrezka';
import { SiteLoader } from '@/service-worker/site-loader/site-loader-interface';

const siteLoaderFactory: Record<SiteType, SiteLoader> = {
  hdrezka: HDrezkaLoader,
};

export default siteLoaderFactory;
