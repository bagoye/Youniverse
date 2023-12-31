import styled, { keyframes } from "styled-components";
import { useNavigate } from "react-router";
import { useRecoilState, useRecoilValue, useResetRecoilState, useSetRecoilState } from "recoil";
import axios from "axios";

import {
  DataState,
  LoginState,
  MemberIdState,
  UserDetailInfoState,
  UserInfoState,
  UserJoinInfoState,
} from "../store/State";
import { getCheckEmailMember } from "../../apis/FrontendApi";
import { MainPaddingContainer } from "../../commons/style/layoutStyle";
import { FlexCenter, FlexColBetween } from "../../commons/style/SharedStyle";
import { ROUTES } from "../../commons/constants/Routes";
import Text from "../../components/atoms/Text";

const LoadingPage = () => {
  const navigate = useNavigate();
  const setUserInfo = useSetRecoilState(UserInfoState);
  // const setIsLoggedIn = useSetRecoilState(LoginState);
  const [isLoggedIn, setIsLoggedIn] = useRecoilState(LoginState);

  const resetUserInfo = useResetRecoilState(UserInfoState);
  const setUserJoinInfo = useSetRecoilState(UserJoinInfoState);
  const resetUserDetailInfo = useResetRecoilState(UserDetailInfoState);
  const resetLogin = useResetRecoilState(LoginState);

  const accessToken = useRecoilValue(UserInfoState).accessToken;
  const refreshToken = useRecoilValue(UserInfoState).refreshToken;

  const [dataState, setDataState] = useRecoilState<boolean>(DataState);
  const setMemberIdState = useSetRecoilState(MemberIdState);

  const currentURL = window.location.href;
  const urlParams = new URLSearchParams(new URL(currentURL).search);
  const codes: string | null = urlParams.get("code");

  const redirectURL = process.env.REACT_APP_REDIRECT_URL || "";
  const clientId = process.env.REACT_APP_CLIENTID || "";
  const apiKey = process.env.REACT_APP_APIKEY || "";
  const clientSecret = process.env.REACT_APP_SECRET || "";
  const fastServerURL = process.env.REACT_APP_FAST_SERVER_URL || "";

  // 상태 변수 추가
  let userEmail: string = "";
  let allData: string = " ";
  let cnt = 0;
  let failCnt = 0;

  // 카운트 증가 함수
  const countToAdd = () => {
    cnt++;
    return cnt;
  };

  const failCountToAdd = () => {
    failCnt++;
    return failCnt;
  };

  // 문자열을 이어붙이는 함수
  const appendToAllData = (text: string) => {
    allData += ", " + text;
  };

  let retryCount = 0; // 재시도 횟수를 추적

  //fastapi로 요청 보낼 함수
  const sendDataToServer = async () => {
    try {
      console.log("allData: ", allData);
      console.log("userEmail: ", userEmail);
      const dataToSend = {
        data: allData,
        email: userEmail,
      };

      const response = await axios.post(fastServerURL + "/youtube/data", dataToSend, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(response);

      if (response.data === "success") {
        console.log("fastapi 서버로 전송했습니다.");
        retryCount = 0; // 요청이 성공하면 재시도 횟수를 초기화
      } else {
        console.error("fastapi 서버 응답이 실패했습니다.");
        retrySendData();
      }
    } catch (error) {
      console.error("데이터를 서버로 보내는 동안 오류 발생:", error);
      retrySendData();
    }
  };

  const retrySendData = () => {
    if (retryCount < 2) {
      // 두 번 이하로 재시도했을 때만 다시 요청
      console.log("30초 후에 다시 시도합니다...");
      retryCount++; // 재시도 횟수 증가
      setTimeout(() => {
        sendDataToServer();
      }, 20000); // 20000ms = 20s
    } else {
      console.error("최대 재시도 횟수에 도달했습니다. 데이터 전송이 실패했습니다.");
    }
  };

  // 로그인 토큰 만료 됐을 때 (refresh)
  const handleTokenExpiry = () => {
    alert("로그인 정보가 만료되었습니다! 재로그인 해주세요.");
    navigate("/");
    resetUserInfo();
    resetUserDetailInfo();
    setMemberIdState(null);
    setUserJoinInfo({
      email: "",
      nickname: "",
      age: 0,
      gender: "",
      introduce: "",
      keywordList: [],
      ottList: [],
    });
    resetLogin();
  };

  // 데이터 요청
  const youtubeRequestData = (token: string) => {
    const apiHeaders = {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    };

    /** 1. 구독 리스트 불러와 구독 채널의 영상 데이터 가져오기 */
    // 구독 리스트 요청
    axios
      .get("https://youtube.googleapis.com/youtube/v3/subscriptions", {
        params: {
          maxResults: 50, // maxResults 파라미터 추가
          part: "snippet", // 필요한 파트 추가
          mine: true,
          key: apiKey,
        },
        headers: apiHeaders,
      })
      .then((response) => {
        // console.log('구독 응답 데이터:', response.data.items);
        interface SubscriptionItem {
          etag: string;
          id: string;
          kind: string;
          snippet: {
            channelId: string;
            description: string;
            publishedAt: string;
            resourceId: {
              kind: string;
              channelId: string;
            };
            title: string;
          };
        }

        const data: SubscriptionItem[] = response.data.items; // 데이터 배열을 직접 설정
        const channelId: string[] = data.map((item) => item.snippet.resourceId.channelId); //채널 아이디
        const titles: string[] = data.map((item) => item.snippet.title); //채널 제목
        const description: string[] = data.map((item) => item.snippet.description); //채널 설명
        // console.log("데이터 추출: ", titles, channelId, description);

        // 배열을 쉼표로 구분된 하나의 텍스트로 만듭니다.
        const titlesText: string = titles.join(", ");
        const descriptionText: string = description.join(", ");

        // allData에 이어붙입니다.
        appendToAllData(titlesText);
        appendToAllData(descriptionText);

        //채널 안 영상 정보 가져오기
        const sendAxiosRequests = async (channelIds: string[]) => {
          try {
            for (const channelId of channelIds) {
              axios
                .get("https://youtube.googleapis.com/youtube/v3/search", {
                  params: {
                    type: "video",
                    maxResults: 50,
                    part: "snippet",
                    channelId: channelId, // 각 채널 ID에 대한 요청을 보냅니다.
                    key: apiKey,
                  },
                  headers: apiHeaders,
                })
                .then((response) => {
                  console.log("영상 정보: ", response.data.items);
                  for (const item of response.data.items) {
                    // 배열을 쉼표로 구분된 하나의 텍스트 만들기
                    appendToAllData(item.snippet.title);
                    appendToAllData(item.snippet.description);
                  }
                })
                .catch((error) => {
                  console.error("영상 정보 요청 실패:", error);
                });
            }
          } catch (error) {
            console.error(`Error fetching data for channel ${channelId}:`, error);
          }
        };
        sendAxiosRequests(channelId);
      })
      .catch((error) => {
        console.error("구독 정보 요청 실패:", error);
      });

    /** 2. 내 계정 채널 재생목록, 재생목록의 영상 데이터 가져오기 */
    // 계정정보 요청
    axios
      .get("https://youtube.googleapis.com/youtube/v3/channels", {
        params: {
          part: "snippet,statistics",
          mine: true,
        },
        headers: apiHeaders,
      })
      .then((response) => {
        const MyData = response.data.items[0];
        console.log("MyData: ", MyData);
        const Nikname = MyData.snippet.title;
        const description = MyData.snippet.description;
        const channelId = MyData.id;
        console.log("내 계정 데이터: ", Nikname, description, channelId);

        //재생목록 요청
        axios
          .get("https://youtube.googleapis.com/youtube/v3/playlists", {
            params: {
              maxResults: 50,
              part: "snippet",
              channelId: channelId,
            },
            headers: apiHeaders,
          })
          .then((response) => {
            // console.log("플레이리스트: ", response.data.items);
            interface Playlist {
              etag: string;
              id: string;
              kind: string;
              snippet: {
                channelId: string;
                channelTitle: string;
                description: string;
                title: string;
              };
            }
            const data: Playlist[] = response.data.items;
            const playlistId: string[] = data.map((item) => item.id); //플레이리스트 아이디
            const playlistTitle: string[] = data.map((item) => item.snippet.title); //플레이리스트 제목
            console.log("플레이리스트 목록: ", playlistId, playlistTitle);

            //플레이리스트 안 영상 정보 가져오기
            const sendPlaylistRequests = async (playlistIds: string[]) => {
              // 모든 요청이 완료될 때 상태를 저장할 배열

              try {
                for (const playlistId of playlistIds) {
                  axios
                    .get("https://youtube.googleapis.com/youtube/v3/playlistItems", {
                      params: {
                        type: "video",
                        maxResults: 50,
                        part: "snippet",
                        playlistId: playlistId,
                      },
                      headers: apiHeaders,
                    })
                    .then((response) => {
                      console.log("플레이리스트 영상 정보: ", response.data.items);
                      for (const item of response.data.items) {
                        appendToAllData(item.snippet.title);
                        appendToAllData(item.snippet.description);
                      }
                      // // 요청이 성공한 경우 상태를 증가시킴
                      // 모든 요청이 완료된 경우 sendDataToServer 호출
                      if (countToAdd() === playlistIds.length) {
                        console.log("데이터 fastapi에 보내기");
                        setTimeout(() => {
                          sendDataToServer();
                        }, 5000); // 5000ms = 5s
                      }
                    })
                    .catch((error) => {
                      console.error("플레이리스트 영상 요청 실패:", error);

                      if (failCountToAdd() === playlistIds.length) {
                        console.log("데이터 fastapi에 보내기");
                        setTimeout(() => {
                          sendDataToServer();
                        }, 6000); // 5000ms = 5s
                      }
                    });
                }
              } catch (error) {
                console.error(`Error fetching data for playlist ${playlistId}:`, error);
              }
            };

            if (!playlistId || playlistId.length === 0) {
              console.log(`Skipping playlistId because it is empty or null.`);
              setTimeout(() => {
                sendDataToServer();
              }, 5000); // 5000ms = 5s
            } else sendPlaylistRequests(playlistId);
          })
          .catch((error) => {
            console.error("재생목록 요청 실패:", error);
          });
      })
      .catch((error) => {
        setTimeout(() => {
          sendDataToServer();
        }, 10000); // 10000ms = 10s
        console.error("내 계정 정보 요청 실패:", error);
      });
  };

  // useEffect(() => {
  const tokenUrl = "https://accounts.google.com/o/oauth2/token";
  const requestData = new URLSearchParams();

  // 코드가 있을 때 (처음에 로그인 했을 때)
  if (codes !== null) {
    console.log("code 데이터:", codes);
    requestData.append("code", codes);
    requestData.append("redirect_uri", redirectURL);
    requestData.append("grant_type", "authorization_code");
    requestData.append("client_id", clientId);
    requestData.append("client_secret", clientSecret);

    // 토큰을 얻는 POST 요청
    axios
      .post(tokenUrl, requestData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })
      .then((response) => {
        const access_token = response.data.access_token;
        const refresh_token = response.data.refresh_token;
        console.log("토큰: ", access_token);
        console.log("전체 데이터==================", response.data);

        // 이메일 정보 가져오기
        axios
          .get("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: {
              Authorization: "Bearer " + access_token,
            },
          })
          .then((response) => {
            console.log("사용자 정보: ", response.data);
            userEmail = response.data.email;
            const userImage = response.data.picture;

            // 이메일로 회원가입 여부 체크
            getCheckEmailMember(userEmail)
              .then((response) => {
                console.log(response);
                if (response.data.nickname !== null) {
                  // 회원인 경우
                  setUserInfo((prev) => ({
                    ...prev,
                    accessToken: access_token,
                    refreshToken: refresh_token,
                    email: userEmail,
                    image: userImage,
                  }));
                  setIsLoggedIn(true);
                  navigate(ROUTES.MAIN);
                } else if (response.data.nickname === null) {
                  // 비회원인 경우
                  youtubeRequestData(access_token);
                  setUserInfo((prev) => ({
                    ...prev,
                    accessToken: access_token,
                    refreshToken: refresh_token,
                    email: userEmail,
                    image: userImage,
                  }));
                  setMemberIdState(response.data.memberId);
                  navigate(ROUTES.ADDINFO);
                }
              })
              .catch((error) => {
                console.error("이메일로 회원가입 여부 체크 오류:", error);
              });
          })
          .catch((error) => {
            console.error("에러 발생: ", error);
          });
      })
      .catch((error) => {
        console.error("토큰 요청 실패:", error);
      });
  }

  // 재요청을 보냈을 때 (데이터 분석 요청)
  if (isLoggedIn && accessToken && dataState) {
    // accessToken 유효 여부를 체크
    const url = `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`;

    axios
      .get(url)
      // accessToken 만료되지 않았을 때
      .then((response) => {
        console.log(response);
        youtubeRequestData(accessToken);
        setDataState(false);
        navigate(ROUTES.MAIN);
      })
      // accessToken 만료되었을 때
      .catch((error) => {
        console.log(error);
        if (!refreshToken) {
          console.error("Refresh token is missing!");
          handleTokenExpiry();
          return;
        }
        const data = new URLSearchParams({
          client_id: clientId || "", // clientId가 정의되지 않았을 때를 대비하여 기본값으로 빈 문자열을 사용
          client_secret: clientSecret || "", // clientSecret가 정의되지 않았을 때를 대비하여 기본값으로 빈 문자열을 사용
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        });

        // axios 요청
        axios
          .post(url, data)
          .then((response) => {
            console.log(response.data);
            setUserInfo((prev) => ({
              ...prev,
              accessToken: response.data.access_token,
            }));
            navigate(ROUTES.LOADING);
          })
          // refreshToken도 만료되었을 때!!!
          .catch((error) => {
            console.error("Error refreshing token:", error);
            handleTokenExpiry();
          });
      });
  }

  return (
    <MainPaddingContainer>
      <StyledLoadingCenter>
        <StyledLoadingContent>
          <Text size="X-Large" color="White" fontFamily="PyeongChang-Bold">
            로딩중입니다
          </Text>
          <Loader />
        </StyledLoadingContent>
      </StyledLoadingCenter>
    </MainPaddingContainer>
  );
};

export default LoadingPage;

const StyledLoadingCenter = styled.div`
  ${FlexCenter}
  height: 100%;
`;

const StyledLoadingContent = styled.div`
  ${FlexColBetween}
  height: 30%;
`;

const flippx = keyframes`
  0%, 49% {
    transform: scaleX(1);
  }
  50%, 100% {
    transform: scaleX(-1);
  }
`;

const spin = keyframes`
  100% {
    transform: rotate(360deg);
  }
`;

export const Loader = styled.div`
  width: calc(100px - 24px);
  height: 50px;
  position: relative;
  animation: ${flippx} 2s infinite linear;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    margin: auto;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    transform-origin: -24px 50%;
    animation: ${spin} 1s infinite linear;
  }

  &::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: #fff;
    width: 48px;
    height: 48px;
    border-radius: 50%;
  }
`;
