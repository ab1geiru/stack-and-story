import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Stack & Story` : "Stack & Story - A Builder's Journal";
  }, [title]);
}
