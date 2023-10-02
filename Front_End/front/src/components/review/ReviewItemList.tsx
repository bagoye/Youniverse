import React from "react";
import { useRecoilValue } from "recoil";
import Wrapper from "../atoms/Wrapper";
import ReviewItem from "./ReviewItem";

import { UserDetailInfoState } from "../../pages/store/State";
import { ReviewType } from "../../pages/recommend/ContentDetailPage"; // Import from ContentDetailPage.tsx

interface ReviewItemListProps {
  reviews: ReviewType[] | null;
}

const ReviewItemList: React.FC<ReviewItemListProps> = ({
  reviews,
}) => {
  const memberId = useRecoilValue(UserDetailInfoState).memberId;
  return (
    <Wrapper size="YouTube" color="WhiteGhost" padding="Narrow">
      {reviews &&
        reviews.map((review) => (
          <ReviewItem
            memberId={memberId}
            key={review.reviewId}
            review={review}
          />
        ))}
    </Wrapper>
  );
};

export default ReviewItemList;
