"use client";
import { Appbar } from "@/components/Appbar";
import { DarkButton } from "@/components/buttons/DarkButton";
import axios from "axios";
import { useEffect, useState } from "react";
import { BACKEND_URL, HOOKS_URL } from "../config";
import { LinkButton } from "@/components/buttons/LinkButton";
import { useRouter } from "next/navigation";

interface Zap {
    id: string;
    triggerId: string;
    userId: number;
    createdAt: string;
    actions: {
        id: string;
        zapId: string;
        actionId: string;
        sortingOrder: number;
        type: {
            id: string;
            name: string;
            image: string;
        };
    }[];
    trigger: {
        id: string;
        zapId: string;
        triggerId: string;
        type: {
            id: string;
            name: string;
            image: string;
        };
    };
}

function useZaps() {
    const [loading, setLoading] = useState(true);
    const [zaps, setZaps] = useState<Zap[]>([]);

    useEffect(() => {
        axios.get(`${BACKEND_URL}/api/v1/zap`, {
            headers: {
                Authorization: localStorage.getItem("token")
            }
        }).then(res => {
            setZaps(res.data.zaps);
            setLoading(false);
        });
    }, []);

    return { loading, zaps };
}

export default function DashboardPage() {
    const { loading, zaps } = useZaps();
    const router = useRouter();

    return (
        <div>
            <Appbar />
            <div className="flex justify-center pt-8">
                <div className="max-w-screen-lg w-full">
                    <div className="flex justify-between pr-8">
                        <div className="text-2xl font-bold">My Zaps</div>
                        <DarkButton onClick={() => router.push("/zap/create")}>Create</DarkButton>
                    </div>
                </div>
            </div>
            {loading ? "Loading..." : (
                <div className="flex justify-center">
                    <ZapTable zaps={zaps} />
                </div>
            )}
        </div>
    );
}

function ZapTable({ zaps }: { zaps: Zap[] }) {
    const router = useRouter();

    return (
        <div className="p-8 max-w-screen-lg w-full">
            <div className="flex font-semibold text-slate-600 border-b pb-2 mb-2">
                <div className="flex-1">Name</div>
                <div className="flex-1">ID</div>
                <div className="flex-1">Created At</div>
                <div className="flex-1">Webhook URL</div>
                <div className="flex-1">Runs</div>
            </div>
            {zaps.map(z => (
                <div key={z.id} className="flex border-b py-4 items-center">
                    <div className="flex-1 flex items-center gap-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={z.trigger.type.image} alt={z.trigger.type.name} className="w-[30px] h-[30px]" />
                        {z.actions.map(x => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={x.id} src={x.type.image} alt={x.type.name} className="w-[30px] h-[30px]" />
                        ))}
                    </div>
                    <div className="flex-1 text-sm font-mono text-slate-500 truncate pr-2">{z.id}</div>
                    <div className="flex-1 text-sm text-slate-600">
                        {new Date(z.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                        })}
                    </div>
                    <div className="flex-1 text-xs text-slate-400 truncate pr-2">
                        {`${HOOKS_URL}/hooks/catch/1/${z.id}`}
                    </div>
                    <div className="flex-1">
                        <LinkButton onClick={() => router.push("/zap/" + z.id)}>View Runs</LinkButton>
                    </div>
                </div>
            ))}
        </div>
    );
}
