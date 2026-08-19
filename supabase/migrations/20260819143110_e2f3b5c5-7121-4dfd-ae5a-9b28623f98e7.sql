DO $$
DECLARE
    v_policy_id uuid;
    v_comm_id uuid;
    v_broker_id uuid;
    v_client_id uuid;
    v_insurer_id uuid;
    v_user_id uuid;
BEGIN
    -- Setup
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    INSERT INTO public.insurers (name) VALUES ('Test Insurer Finance 4') RETURNING id INTO v_insurer_id;
    INSERT INTO public.clients (full_name) VALUES ('Test Client Finance 4') RETURNING id INTO v_client_id;
    INSERT INTO public.brokers (full_name, user_id) VALUES ('Test Broker Finance 4', v_user_id) RETURNING id INTO v_broker_id;
    
    -- TEST 6 & 1: Criar apólice e verificar comissão prevista
    INSERT INTO public.policies (client_id, broker_id, insurer_id, policy_number, commission_amount, start_date, end_date, status, type, premium)
    VALUES (v_client_id, v_broker_id, v_insurer_id, 'TEST-FIN-004', 1500, now(), now() + interval '1 year', 'issued', 'auto', 10000)
    RETURNING id INTO v_policy_id;
    
    SELECT id INTO v_comm_id FROM public.commissions WHERE policy_id = v_policy_id;
    
    IF (SELECT status FROM public.commissions WHERE id = v_comm_id) != 'expected' THEN
        RAISE EXCEPTION 'Test 1/6 Failed: Status should be expected, got %', (SELECT status FROM public.commissions WHERE id = v_comm_id);
    END IF;

    -- TEST 7: Editar apólice e não criar nova comissão
    UPDATE public.policies SET commission_amount = 1600 WHERE id = v_policy_id;
    IF (SELECT count(*) FROM public.commissions WHERE policy_id = v_policy_id) > 1 THEN
        RAISE EXCEPTION 'Test 7 Failed: Duplicate commission created';
    END IF;

    -- TEST 4: Recebimento parcial (1000 de 1500)
    INSERT INTO public.commission_receipts (commission_id, amount, receipt_date)
    VALUES (v_comm_id, 1000, now()::date);
    
    IF (SELECT status FROM public.commissions WHERE id = v_comm_id) != 'partial' THEN
        RAISE EXCEPTION 'Test 4 Failed: Status should be partial';
    END IF;

    -- TEST 5/2: Segundo recebimento (1000 + 500 = 1500)
    INSERT INTO public.commission_receipts (commission_id, amount, receipt_date)
    VALUES (v_comm_id, 500, now()::date);
    
    IF (SELECT status FROM public.commissions WHERE id = v_comm_id) != 'paid' THEN
        RAISE EXCEPTION 'Test 5/2 Failed: Status should be paid after full receipt';
    END IF;

    -- TEST 3: Divergência (Adicionar mais 100 -> 1600 total vs 1500 previsto)
    INSERT INTO public.commission_receipts (commission_id, amount, receipt_date)
    VALUES (v_comm_id, 100, now()::date);
    
    IF (SELECT status FROM public.commissions WHERE id = v_comm_id) != 'divergent' THEN
        RAISE EXCEPTION 'Test 3 Failed: Status should be divergent';
    END IF;

    -- Test 10: Auditoria
    IF NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE entity = 'commissions' AND record_id = v_comm_id) THEN
        RAISE EXCEPTION 'Test 10 Failed: No audit log found for commission';
    END IF;
END $$;
