"use client";

import { BACKEND_URL } from "@/app/config";
import { Appbar } from "@/components/Appbar";
import { Input } from "@/components/Input";
import { ZapCell } from "@/components/ZapCell";
import { LinkButton } from "@/components/buttons/LinkButton";
import { PrimaryButton } from "@/components/buttons/PrimaryButton";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface AvailableItem {
    id: string;
    name: string;
    image: string;
}

interface SelectedAction {
    index: number;
    availableActionId: string;
    availableActionName: string;
    metadata: Record<string, string>;
}

function useAvailableActionsAndTriggers() {
    const [availableActions, setAvailableActions] = useState<AvailableItem[]>([]);
    const [availableTriggers, setAvailableTriggers] = useState<AvailableItem[]>([]);

    useEffect(() => {
        axios.get(`${BACKEND_URL}/api/v1/trigger/available`)
            .then(x => setAvailableTriggers(x.data.availableTriggers));
        axios.get(`${BACKEND_URL}/api/v1/action/available`)
            .then(x => setAvailableActions(x.data.availableActions));
    }, []);

    return { availableActions, availableTriggers };
}

export default function CreateZapPage() {
    const router = useRouter();
    const { availableActions, availableTriggers } = useAvailableActionsAndTriggers();
    const [selectedTrigger, setSelectedTrigger] = useState<{ id: string; name: string }>();
    const [selectedActions, setSelectedActions] = useState<SelectedAction[]>([]);
    const [selectedModalIndex, setSelectedModalIndex] = useState<null | number>(null);

    return (
        <div>
            <Appbar />
            <div className="flex justify-end bg-slate-200 p-4">
                <PrimaryButton onClick={async () => {
                    if (!selectedTrigger?.id) return;
                    await axios.post(`${BACKEND_URL}/api/v1/zap`, {
                        availableTriggerId: selectedTrigger.id,
                        triggerMetadata: {},
                        actions: selectedActions.map(a => ({
                            availableActionId: a.availableActionId,
                            actionMetadata: a.metadata
                        }))
                    }, {
                        headers: { Authorization: localStorage.getItem("token") }
                    });
                    router.push("/dashboard");
                }}>Publish</PrimaryButton>
            </div>
            <div className="w-full min-h-screen bg-slate-200 flex flex-col justify-center">
                <div className="flex justify-center w-full">
                    <ZapCell
                        onClick={() => setSelectedModalIndex(1)}
                        name={selectedTrigger?.name ?? "Trigger"}
                        index={1}
                    />
                </div>
                <div className="w-full pt-2 pb-2">
                    {selectedActions.map((action) => (
                        <div key={action.index} className="pt-2 flex justify-center">
                            <ZapCell
                                onClick={() => setSelectedModalIndex(action.index)}
                                name={action.availableActionName || "Action"}
                                index={action.index}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-center">
                    <PrimaryButton onClick={() => {
                        setSelectedActions(a => [...a, {
                            index: a.length + 2,
                            availableActionId: "",
                            availableActionName: "",
                            metadata: {}
                        }]);
                    }}>
                        <div className="text-2xl">+</div>
                    </PrimaryButton>
                </div>
            </div>
            {selectedModalIndex && (
                <Modal
                    availableItems={selectedModalIndex === 1 ? availableTriggers : availableActions}
                    onSelect={(props) => {
                        if (props === null) {
                            setSelectedModalIndex(null);
                            return;
                        }
                        if (selectedModalIndex === 1) {
                            setSelectedTrigger({ id: props.id, name: props.name });
                        } else {
                            setSelectedActions(a => {
                                const newActions = [...a];
                                newActions[selectedModalIndex - 2] = {
                                    index: selectedModalIndex,
                                    availableActionId: props.id,
                                    availableActionName: props.name,
                                    metadata: props.metadata
                                };
                                return newActions;
                            });
                        }
                        setSelectedModalIndex(null);
                    }}
                    index={selectedModalIndex}
                />
            )}
        </div>
    );
}

function Modal({ index, onSelect, availableItems }: {
    index: number;
    onSelect: (props: null | { name: string; id: string; metadata: Record<string, string> }) => void;
    availableItems: AvailableItem[];
}) {
    const [step, setStep] = useState(0);
    const [selectedAction, setSelectedAction] = useState<{ id: string; name: string }>();
    const isTrigger = index === 1;

    return (
        <div className="fixed top-0 right-0 left-0 z-50 flex justify-center items-center w-full h-full bg-slate-100 bg-opacity-70">
            <div className="relative p-4 w-full max-w-2xl">
                <div className="relative bg-white rounded-lg shadow">
                    <div className="flex items-center justify-between p-4 border-b rounded-t">
                        <div className="text-xl">Select {isTrigger ? "Trigger" : "Action"}</div>
                        <button
                            onClick={() => onSelect(null)}
                            type="button"
                            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
                        >
                            <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                            </svg>
                            <span className="sr-only">Close modal</span>
                        </button>
                    </div>
                    <div className="p-4 space-y-4">
                        {step === 1 && selectedAction?.id === "email" && (
                            <EmailSelector setMetadata={(metadata) => onSelect({ ...selectedAction, metadata })} />
                        )}
                        {step === 1 && selectedAction?.id === "send-sol" && (
                            <SolanaSelector setMetadata={(metadata) => onSelect({ ...selectedAction, metadata })} />
                        )}
                        {step === 0 && (
                            <div>
                                {availableItems.map(({ id, name, image }) => (
                                    <div
                                        key={id}
                                        onClick={() => {
                                            if (isTrigger) {
                                                onSelect({ id, name, metadata: {} });
                                            } else {
                                                setStep(s => s + 1);
                                                setSelectedAction({ id, name });
                                            }
                                        }}
                                        className="flex border p-4 cursor-pointer hover:bg-slate-100"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={image} alt={name} width={30} className="rounded-full" />
                                        <div className="flex flex-col justify-center">{name}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmailSelector({ setMetadata }: { setMetadata: (params: Record<string, string>) => void }) {
    const [email, setEmail] = useState("");
    const [body, setBody] = useState("");

    return (
        <div>
            <Input label="To" type="text" placeholder="To" onChange={e => setEmail(e.target.value)} />
            <Input label="Body" type="text" placeholder="Body" onChange={e => setBody(e.target.value)} />
            <div className="pt-2">
                <PrimaryButton onClick={() => setMetadata({ email, body })}>Submit</PrimaryButton>
            </div>
        </div>
    );
}

function SolanaSelector({ setMetadata }: { setMetadata: (params: Record<string, string>) => void }) {
    const [amount, setAmount] = useState("");
    const [address, setAddress] = useState("");

    return (
        <div>
            <Input label="To" type="text" placeholder="Address" onChange={e => setAddress(e.target.value)} />
            <Input label="Amount" type="text" placeholder="Amount" onChange={e => setAmount(e.target.value)} />
            <div className="pt-4">
                <PrimaryButton onClick={() => setMetadata({ amount, address })}>Submit</PrimaryButton>
            </div>
        </div>
    );
}
