import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

/** Reads a one-time message passed through navigation state, then clears it so a refresh will not repeat it. */
export function useFlash() {
  const location = useLocation();
  const navigate = useNavigate();
  const [flash, setFlash] = useState(location.state?.flash ?? null);

  useEffect(() => {
    if (location.state?.flash) {
      setFlash(location.state.flash);
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null, preventScrollReset: true });
    }
  }, [location.state, location.pathname, location.search, navigate]);

  return [flash, () => setFlash(null)];
}
