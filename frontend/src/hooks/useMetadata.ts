import { useState, useEffect } from 'react';
import type { MusicMetadata } from '@/services/sui/metadata';

// Hook to fetch metadata from metadata_uri
export function useMetadata(metadataUri: string | null | undefined) {
  const [metadata, setMetadata] = useState<MusicMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!metadataUri) {
      setMetadata(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Fetch metadata from the URI
    fetch(metadataUri)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data: MusicMetadata) => {
        setMetadata(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching metadata:', err);
        setError(err.message);
        setIsLoading(false);
        
        // Fallback to default metadata if fetch fails
        setMetadata({
          title: 'Untitled Track',
          description: 'No description available',
          artist: 'Unknown Artist',
          genre: 'Unknown',
          duration: 180,
          price: 0.001,
        });
      });
  }, [metadataUri]);

  return { metadata, isLoading, error };
}
