import React from 'react';
import TVContentCard, { TVContentItem } from '../catalog/TVContentCard';

type TVSeriesCardProps = React.ComponentProps<typeof TVContentCard> & {
  item: TVContentItem;
};

const TVSeriesCard: React.FC<TVSeriesCardProps> = (props) => {
  return <TVContentCard {...props} />;
};

export default TVSeriesCard;
