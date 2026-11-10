import React from 'react';
import { WebcamsView } from './WebcamsView';

interface LiveCamsProps {
  onOpenStationSearch?: () => void;
}

/**
 * LiveCams alias component for WebcamsView
 */
export const LiveCams: React.FC<LiveCamsProps> = (props) => {
  return <WebcamsView {...props} />;
};

export default LiveCams;
