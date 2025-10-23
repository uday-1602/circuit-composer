
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { EditorLanguage } from "@/types/circuit";

interface QasmEditorProps {
    code: string;
    onCodeChange: (code: string) => void;
    onBlur: () => void;
    language: EditorLanguage;
    setLanguage: (language: EditorLanguage) => void;
}

export default function QasmEditor({ code, onCodeChange, onBlur, language, setLanguage }: QasmEditorProps) {
    
    return (
        <Card className="flex-1 flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Code Editor</CardTitle>
                        <CardDescription>
                            View and edit the circuit representation.
                        </CardDescription>
                    </div>
                    <Select value={language} onValueChange={(value) => setLanguage(value as EditorLanguage)}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Language" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="qasm">QASM</SelectItem>
                            <SelectItem value="qiskit">Qiskit</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex">
                <Textarea
                    value={code}
                    onChange={(e) => onCodeChange(e.target.value)}
                    onBlur={onBlur}
                    placeholder={language === 'qasm' ? 'OPENQASM 2.0;' : '# Qiskit code'}
                    className="font-code text-xs w-full h-full resize-none"
                />
            </CardContent>
        </Card>
    )
}
