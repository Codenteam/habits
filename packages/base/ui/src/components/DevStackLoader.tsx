import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { loadShowcaseHabit } from '../lib/showcaseLoader';

/** ?load=hello-world downloads the habit from the published showcase index */
export default function DevStackLoader() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('load');
    if (!slug) return;

    loadShowcaseHabit(slug, dispatch).catch((err) => {
      console.error('[ShowcaseLoader]', err);
    });
  }, [dispatch]);

  return null;
}
