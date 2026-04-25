"""Script de seed — popula dados iniciais.

Uso:  python -m scripts.seed
"""
from datetime import date

from sqlalchemy import delete

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.academy import Academy
from app.models.athlete import Athlete, AthleteRole, AthleteSex
from app.models.graduation_request import GraduationRequest


def run() -> None:
    db = SessionLocal()
    try:
        print("Limpando dados existentes...")
        db.execute(delete(GraduationRequest))
        db.execute(delete(Academy))
        db.execute(delete(Athlete))
        db.commit()

        # ----------------------------------------
        # Admin
        # ----------------------------------------
        print("Criando admin...")
        admin = Athlete(
            name="Administrador FECOT",
            email="admin@fecot.com.br",
            cpf="00000000000",
            graduation="5º Dan",
            role=AthleteRole.admin,
            birth_date=date(1980, 5, 15),
            weight_kg=80.0,
            sex=AthleteSex.male,
            password_digest=hash_password("00000000000"),
        )
        db.add(admin)
        db.flush()

        # ----------------------------------------
        # Academy managers (2)
        # ----------------------------------------
        print("Criando gestores de academia...")
        carlos = Athlete(
            name="Mestre Carlos Silva",
            email="carlos@tigretaekwondo.com.br",
            cpf="11111111111",
            phone="(61) 99999-1111",
            graduation="3º Dan",
            role=AthleteRole.academy_manager,
            birth_date=date(1975, 3, 22),
            weight_kg=78.0,
            sex=AthleteSex.male,
            password_digest=hash_password("11111111111"),
        )
        ana = Athlete(
            name="Mestra Ana Santos",
            email="ana@dragaotaekwondo.com.br",
            cpf="22222222222",
            phone="(61) 99999-2222",
            graduation="2º Dan",
            role=AthleteRole.academy_manager,
            birth_date=date(1982, 11, 8),
            weight_kg=62.0,
            sex=AthleteSex.female,
            password_digest=hash_password("22222222222"),
        )
        db.add_all([carlos, ana])
        db.flush()

        # ----------------------------------------
        # Academies
        # ----------------------------------------
        print("Criando academias...")
        tigre = Academy(
            name="Academia Tigre Taekwondo",
            cnpj="12345678000190",
            address="SCS Quadra 7, Bloco A",
            city="Brasília",
            state="DF",
            zip_code="70307-901",
            latitude=-15.7801,
            longitude=-47.9292,
            phone="(61) 3333-1111",
            email="contato@tigretaekwondo.com.br",
            manager_id=carlos.id,
        )
        dragao = Academy(
            name="Centro de Treinamento Dragão",
            cnpj="98765432000110",
            address="CLN 204, Bloco C",
            city="Brasília",
            state="DF",
            zip_code="70843-530",
            latitude=-15.8267,
            longitude=-48.0495,
            phone="(61) 3333-2222",
            email="contato@dragaotaekwondo.com.br",
            manager_id=ana.id,
        )
        db.add_all([tigre, dragao])
        db.flush()

        # ----------------------------------------
        # Professores dedicados (teachers)
        # ----------------------------------------
        print("Criando professores...")
        pedro = Athlete(
            name="Professor Pedro Lima",
            email="pedro@tigretaekwondo.com.br",
            cpf="66666666666",
            phone="(61) 99999-6666",
            graduation="1º Dan",
            role=AthleteRole.teacher,
            birth_date=date(1990, 7, 10),
            weight_kg=75.0,
            sex=AthleteSex.male,
            password_digest=hash_password("66666666666"),
        )
        db.add(pedro)
        db.flush()

        # Pedro dá aula em Tigre e Dragão (N:N)
        tigre.teachers.append(carlos)       # Carlos também ensina na sua própria academia
        tigre.teachers.append(pedro)
        dragao.teachers.append(ana)
        dragao.teachers.append(pedro)       # <- mesmo professor em 2 academias

        # ----------------------------------------
        # Alunos
        # ----------------------------------------
        print("Criando alunos...")
        alunos = [
            Athlete(
                name="João Pedro Oliveira",
                email="joao@example.com",
                cpf="33333333333",
                phone="(61) 99999-3333",
                graduation="5º Gub",
                role=AthleteRole.athlete,
                birth_date=date(2008, 2, 14),
                weight_kg=55.0,
                sex=AthleteSex.male,
                home_academy_id=tigre.id,
                professor_id=carlos.id,
                password_digest=hash_password("33333333333"),
            ),
            Athlete(
                name="Maria Eduarda Costa",
                email="maria@example.com",
                cpf="44444444444",
                phone="(61) 99999-4444",
                graduation="3º Gub",
                role=AthleteRole.athlete,
                birth_date=date(2010, 9, 3),
                weight_kg=48.0,
                sex=AthleteSex.female,
                home_academy_id=tigre.id,
                professor_id=pedro.id,
                password_digest=hash_password("44444444444"),
            ),
            Athlete(
                name="Lucas Fernandes",
                graduation="7º Gub",
                role=AthleteRole.athlete,
                birth_date=date(2012, 4, 20),
                weight_kg=42.0,
                sex=AthleteSex.male,
                home_academy_id=dragao.id,
                professor_id=ana.id,
            ),
            Athlete(
                name="Beatriz Almeida",
                email="beatriz@example.com",
                cpf="55555555555",
                graduation="1º Dan",
                role=AthleteRole.athlete,
                birth_date=date(2005, 12, 1),
                weight_kg=58.0,
                sex=AthleteSex.female,
                home_academy_id=dragao.id,
                professor_id=pedro.id,
                password_digest=hash_password("55555555555"),
            ),
        ]
        db.add_all(alunos)
        db.commit()

        # ----------------------------------------
        # GraduationRequest exemplo (pendente)
        # ----------------------------------------
        print("Criando solicitação de graduação pendente...")
        joao = alunos[0]
        req = GraduationRequest(
            athlete_id=joao.id,
            from_graduation=joao.graduation,
            to_graduation="4º Gub",
            requested_by_id=carlos.id,
            reason="João completou o ciclo de treinamento e passou no exame interno.",
        )
        db.add(req)
        db.commit()

        print()
        print("Seed concluído com sucesso!")
        print(f"  Atletas: {db.query(Athlete).count()}")
        print(f"  Academias: {db.query(Academy).count()}")
        print(f"  Solicitações de graduação: {db.query(GraduationRequest).count()}")
        print()
        print("Credenciais:")
        print("  Admin:            admin@fecot.com.br            / 00000000000")
        print("  Academy Manager:  carlos@tigretaekwondo.com.br  / 11111111111")
        print("  Academy Manager:  ana@dragaotaekwondo.com.br    / 22222222222")
        print("  Teacher:          pedro@tigretaekwondo.com.br   / 66666666666")
        print("  Aluno:            joao@example.com              / 33333333333")
    finally:
        db.close()


if __name__ == "__main__":
    run()
