import { useState, useEffect } from "react";
import styled from "styled-components";
import { useRecoilValue } from "recoil";

import { getMember } from "../../apis/FrontendApi";
import { UserDetailInfoState } from "../store/State";
import { MainPaddingContainer } from "../../commons/style/layoutStyle";
import {
  FlexRowBetween,
} from "../../commons/style/SharedStyle";
import SoulMovieItemList, {
  SoulMovie,
} from "../../components/movies/SoulMovieItemList";
import MyOTTPlanet from "../../components/users/MyOTTPlanet";
import MypageFollowWrap from "../../components/users/MypageFollowWrap";
import MypageLikeContents from "../../components/users/MypageLikeContents";
import MypageUserInfo from "../../components/users/MypageUserInfo";
import UserZodiacSign from "../../components/users/UserZodiacSign";
import { FollowerType } from "../../components/organisms/OtherProfileContainer";
import MyProfileReview from "../../components/review/MyProfileReview";

export type UserType = {
  memberId: number;
  nickname: string;
  email: string;
  gender: string;
  age: number;
  introduce: string;
  memberImage: string;
  ottResDtos: Array<{
    ottImage: string;
    ottId: number;
    ottName: string;
    ottUrl: string;
  }>;
  keywordResDtos: Array<{
    keywordName: string;
    source: number;
  }>;
  followers: Array<FollowerType>;
  followings: Array<any>;
  heartMovieResDtos: Array<any>; // 구체적인 타입 정보 들어오면 수정 @@@
  bestMovieResDtos: Array<SoulMovie>;
  reviewResDtos: Array<any>; // 구체적인 타입 정보 들어오면 수정 @@@
  youtubeKeywordResDtos: Array<{
    youtubeKeywordId: number;
    youtubeKeywordName: string;
    movieRank: number;
  }>;
  recommendOttResDtos: Array<any>; // 구체적인 타입 정보 들어오면 수정 @@@
};

const MyProfilePage = () => {
  const memberId = useRecoilValue(UserDetailInfoState).memberId;
  const [memberData, setMemberData] = useState<UserType | null>(null);
  const [followStatus, setFollowStatus] = useState<string>("");

  useEffect(() => {
    getMember(Number(memberId))
      .then((response) => {
        console.log("개별 회원 조회", `${memberId}번 회원=`, response.data);
        setMemberData(response.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [memberId]);

  return (
    <MainPaddingContainer>
      <div className="flex gap-6 h-full">
        {memberData && (
          <>
            <div className="w-1/5">
              <MypageUserInfo
                memberData={memberData}
                setMemberData={setMemberData}
                followStatus={followStatus}
                setFollowStatus={setFollowStatus}
              />
            </div>
            <StyledContentWrap className="w-4/5">
              {!followStatus && (
                <>
                  <StyledRowWrap>
                    <UserZodiacSign
                      width="420%"
                      height="160%"
                      memberData={memberData}
                    />
                    <MyOTTPlanet memberData={memberData} />
                  </StyledRowWrap>
                  <StyledRowWrap>
                    <MypageLikeContents memberData={memberData} />
                    <MyProfileReview memberId={Number(memberId)} />
                  </StyledRowWrap>
                  <div>
                    <SoulMovieItemList />
                  </div>
                </>
              )}

              {followStatus && (
                <MypageFollowWrap
                  memberData={memberData}
                  followStatus={followStatus}
                  setFollowStatus={setFollowStatus}
                />
              )}
            </StyledContentWrap>
          </>
        )}
      </div>
    </MainPaddingContainer>
  );
};

export default MyProfilePage;

const StyledContentWrap = styled.div`
  overflow-y: auto;
  padding-right: 0.5rem;
`;

export const StyledRowWrap = styled.div`
  ${FlexRowBetween}
  & > div:first-child {
    width: 44%;
    height: 100%;
  }
  & > div:last-child {
    width: 53%;
    height: 100%;
  }
  margin-bottom: 2rem;
  /* height: 70%; */
`;
