import React from 'react';
import TVContentCard, { TVContentItem } from '../catalog/TVContentCard';

type TVMovieCardProps = React.ComponentProps<typeof TVContentCard> & {
  item: TVContentItem;
};

const TVMovieCard: React.FC<TVMovieCardProps> = (props) => {
  return <TVContentCard {...props} />;
};

export default TVMovieCard;
