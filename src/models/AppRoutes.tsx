import { createBrowserRouter, type DataRouter } from "react-router-dom";
import App from "../App";
import HomePage from "../pages/HomePage";
import AuthPage from "../pages/AuthPage";
import Login from "../features/auth/Login";
import Signup from "../features/auth/Signup";

//creates a dataRouter which is a routing list or map
const routeList: DataRouter = createBrowserRouter([
    {
        path: "/",  //path specifies the path
        Component: App,//component specifies the component to be loaded in
        children: [//children are what can be loaded through the <Outlet> tag in tsx
            //a child route component will replace the <Outlet> tag. Here App.tsx has a fixed navbar and then a <Outlet> which gets replaced by poges
            { index: true, Component: HomePage },
            {
                path: "auth",//auth replaces the page with an auth layout page. This auth layout page can display
                //both signup and login form, so if the url includes /login or /signup then the <Outlet> in Auth layout will be replaced by either form
                Component: AuthPage,
                children: [
                    {
                        path: "login",
                        Component: Login,
                    },
                    {
                        path: "signup",
                        Component: Signup
                    }
                ]

            }

        ]
    }

]);

export default routeList;