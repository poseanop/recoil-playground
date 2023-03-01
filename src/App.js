import {
  atom,
  selector,
  RecoilRoot,
  useRecoilValue,
  useRecoilState,
  useSetRecoilState,
  selectorFamily,
  waitForAll,
  waitForNone,
  useRecoilCallback,
} from "recoil";
import * as React from "react";

const myDBQuery = ({ userID }) => {
  console.log("요청", userID);
  return new Promise((res, rej) => {
    const table = new Array(10).fill(0).map((item, i) => {
      return `${i}번째 유저`;
    });
    const index = (table.indexOf(userID) + 1) % 10;
    const nextIndex = (table.indexOf(userID) + 2) % 10;
    const nextIndex2 = (table.indexOf(userID) + 3) % 10;
    setTimeout(() => {
      res({
        name: userID,
        friendList: [table[index], table[nextIndex], table[nextIndex2]],
      });
    }, 1000);
  });
};

const currentUserIDState = atom({
  key: "CurrentUserID",
  default: "0번째 유저",
});

const userInfoQuery = selectorFamily({
  key: "UserInfoQuery",
  get: (userID) => async () => {
    const response = await myDBQuery({ userID });
    if (response.error) {
      throw response.error;
    }
    return response;
  },
});

const currentUserInfoQuery = selector({
  key: "CurrentUserInfoQuery",
  get: ({ get }) => get(userInfoQuery(get(currentUserIDState))),
});

const friendsInfoQuery = selector({
  key: "FriendsInfoQuery",
  get: ({ get }) => {
    const { friendList } = get(currentUserInfoQuery);
    const friendLoadables = get(
      waitForNone(friendList.map((friendID) => userInfoQuery(friendID)))
    );
    console.log(friendLoadables);
    return friendLoadables
      .filter(({ state }) => state === "hasValue")
      .map(({ contents }) => contents);
    // return friends;
    // return friendList.map((friendID) => get(userInfoQuery(friendID)));
  },
});

function CurrentUserInfo() {
  const currentUser = useRecoilValue(currentUserInfoQuery);
  const friends = useRecoilValue(friendsInfoQuery);
  // const changeUser = useSetRecoilState(currentUserIDState);
  const changeUser = useRecoilCallback(({ snapshot, set }) => (userID) => {
    snapshot.getLoadable(userInfoQuery(userID)); // pre-fetch user info
    set(currentUserIDState, userID); // change current user to start new render
  });
  return (
    <div>
      <h1>{currentUser.name}</h1>
      <ul>
        {friends.map((friend, idx) => (
          <li key={idx} onClick={() => changeUser(friend.name)}>
            {friend.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MyApp() {
  return (
    <RecoilRoot>
      <React.Suspense fallback={<div>Loading...</div>}>
        <CurrentUserInfo />
      </React.Suspense>
    </RecoilRoot>
  );
}

export default MyApp;
