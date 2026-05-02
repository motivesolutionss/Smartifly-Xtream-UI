import React from 'react';
import TVContentCard, { TVContentItem } from '../catalog/TVContentCard';

type TVLiveCardProps = React.ComponentProps<typeof TVContentCard> & {
  item: TVContentItem;
};

const TVLiveCard: React.FC<TVLiveCardProps> = (props) => {
  return <TVContentCard {...props} />;
};

export default TVLiveCard;
