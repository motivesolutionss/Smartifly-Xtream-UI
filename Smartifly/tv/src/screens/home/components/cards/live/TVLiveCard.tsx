import React from 'react';
import TVContentCard, { TVContentItem } from '../base/BaseContentCard';

type TVLiveCardProps = React.ComponentProps<typeof TVContentCard> & {
  item: TVContentItem;
};

const TVLiveCard: React.FC<TVLiveCardProps> = (props) => {
  return <TVContentCard {...props} />;
};

export default TVLiveCard;
