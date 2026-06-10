"use client";
import { useRouter } from "next/navigation";
import { LinkButton } from "./buttons/LinkButton";
import { PrimaryButton } from "./buttons/PrimaryButton";
import { useEffect, useState } from "react";

export const Appbar = () => {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        setIsLoggedIn(!!token);
    }, []);

    function handleLogout() {
        localStorage.removeItem("token");
        router.push("/login");
    }

    return (
        <div className="flex border-b justify-between p-4">
            <div
                className="flex flex-col justify-center text-2xl font-extrabold cursor-pointer"
                onClick={() => router.push(isLoggedIn ? "/dashboard" : "/")}
            >
                FlowForge
            </div>
            <div className="flex items-center gap-4">
                {isLoggedIn ? (
                    <>
                        <LinkButton onClick={() => router.push("/dashboard")}>Dashboard</LinkButton>
                        <PrimaryButton onClick={handleLogout}>Logout</PrimaryButton>
                    </>
                ) : (
                    <>
                        <LinkButton onClick={() => {}}>Contact Sales</LinkButton>
                        <LinkButton onClick={() => router.push("/login")}>Login</LinkButton>
                        <PrimaryButton onClick={() => router.push("/signup")}>Signup</PrimaryButton>
                    </>
                )}
            </div>
        </div>
    );
};
