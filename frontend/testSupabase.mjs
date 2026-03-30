import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jrhxtpnpkyiyskwptizu.supabase.co';
const supabaseAnonKey = 'sb_publishable_INaSKuqdmCdZ7nSAVMb1sg_9jgCfswl';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    // get enum values for estado_cerradura
    const { data: enumData, error: enumError } = await supabase.rpc('get_enum_values', {});
    
    // Actually, just query information_schema if we can, 
    // but the REST API blocks information_schema usually.
    // Let's try inserting an invalid value into cerraduras to trigger an error message that lists the enum values!
    
    const { data, error } = await supabase.from('cerraduras').insert([{ id: '00000000-0000-0000-0000-000000000000', salon_id: '00000000-0000-0000-0000-000000000000', codigo_dispositivo: 'A', estado: 'INVALID_ENUM_VALUE' }]);
    
    console.log('Error:', error);
}

test();
