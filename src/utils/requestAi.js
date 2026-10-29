import { supabase } from '../lib/supabase';

export async function requestAi(body, signal) {
    const controller = new AbortController();
    let timedOut = false;

    const abort = () => controller.abort();

    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abort);

    const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, 30000);

    const kind = body?.kind === 'classify' ? 'classify' : 'chat';

    try {
        console.log('[AI] İstek başladı:', kind);

        const { data, error } = await supabase.functions.invoke(
            'pito-ai',
            {
                body,
                signal: controller.signal,
            }
        );

        const status = error?.context?.status;

        if (error) {
            let code = status === 401 ? 'auth' : 'unavailable';

            try {
                const detail = await error.context?.json();

                const knownCodes = [
                    'auth',
                    'input',
                    'image',
                    'quota',
                    'provider_limit',
                    'configuration',
                    'quota_unavailable',
                    'provider',
                    'timeout',
                    'unavailable',
                ];

                if (knownCodes.includes(detail?.code)) {
                    code = detail.code;
                }
            } catch {
                // Yanıt JSON değilse durum koduyla devam et.
            }

            console.log('[AI] Sunucu hatası:', {
                kind,
                status: status ?? null,
                code,
                errorType: error.name,
            });

            throw Object.assign(new Error(code), { code, status });
        }

        console.log('[AI] İstek sonucu:', {
            kind,
            success: data?.success === true,
            code: data?.code,
        });

        if (data?.success !== true) {
            const code = data?.code || 'unavailable';
            throw Object.assign(new Error(code), { code });
        }

        return data;
    } catch (error) {
        const code = timedOut
            ? 'timeout'
            : controller.signal.aborted
                ? 'cancelled'
                : error?.code || 'unavailable';

        console.log('[AI] Çağrı tamamlanamadı:', {
            kind,
            code,
            status: error?.status ?? null,
        });

        throw Object.assign(new Error(code), {
            code,
            status: error?.status,
        });
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
    }
}

export function aiErrorText(error, english = false) {
    const code = error?.code;

    if (code === 'auth') {
        return english
            ? 'Please sign in again to use AI.'
            : 'Yapay zekâyı kullanmak için yeniden giriş yapın.';
    }

    if (['quota', 'provider_limit'].includes(code)) {
        return english
            ? 'The request limit was reached. Please try again later.'
            : 'İstek sınırına ulaşıldı. Lütfen daha sonra tekrar deneyin.';
    }

    if (['image', 'input'].includes(code)) {
        return english
            ? 'Check your input. Use a JPEG, PNG or WebP photo up to 4 MB.'
            : 'Girdiyi kontrol edin. En fazla 4 MB JPEG, PNG veya WebP fotoğraf kullanın.';
    }

    if (code === 'configuration') {
        return english
            ? 'AI server configuration is incomplete.'
            : 'Yapay zekâ sunucu yapılandırması eksik.';
    }

    if (code === 'quota_unavailable') {
        return english
            ? 'The usage check is unavailable. Please try again later.'
            : 'Kullanım sınırı kontrol edilemiyor. Lütfen daha sonra tekrar deneyin.';
    }

    if (code === 'timeout') {
        return english
            ? 'The request timed out. Please try again.'
            : 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
    }

    return english
        ? 'AI could not respond. Check your connection and try again later.'
        : 'Yapay zekâ yanıt veremedi. Bağlantınızı kontrol edip daha sonra tekrar deneyin.';
}