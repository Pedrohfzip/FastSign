'use strict';

const fs = require('fs/promises');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

// Mesma resolução de caminho usada em StorageService.js (backend/Service/StorageService.js)
// — `file_path` é salvo relativo a esse diretório.
const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(process.cwd(), 'storage', 'documents');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Preenche `page_count` pras DocumentVersion criadas ANTES do PdfStampService passar a
  // populá-lo (toda v1 de upload, e qualquer versão anterior a essa mudança — ver
  // "Pendências conhecidas" no CLAUDE.md, que documentava isso como "sem backfill" até
  // agora). Só toca linhas com page_count NULL, então é seguro rodar mais de uma vez.
  // Por linha, se o arquivo não existir mais em disco ou o PDF não abrir, loga um aviso
  // e deixa null pra essa linha — não interrompe o backfill das demais.
  async up(queryInterface) {
    const [versions] = await queryInterface.sequelize.query(
      'SELECT id, file_path FROM document_versions WHERE page_count IS NULL'
    );

    let updated = 0;
    for (const version of versions) {
      try {
        const buffer = await fs.readFile(path.join(STORAGE_ROOT, version.file_path));
        const pdfDoc = await PDFDocument.load(buffer);
        const pageCount = pdfDoc.getPageCount();

        await queryInterface.sequelize.query(
          'UPDATE document_versions SET page_count = :pageCount WHERE id = :id',
          { replacements: { pageCount, id: version.id } }
        );
        updated += 1;
      } catch (err) {
        console.warn(
          `[backfill-document-version-page-count] pulou ${version.id} (${version.file_path}): ${err.message}`
        );
      }
    }

    console.log(`[backfill-document-version-page-count] ${updated}/${versions.length} versões atualizadas.`);
  },

  // Reverter um backfill de dados não tem um "estado anterior" único pra voltar (não dá
  // pra saber, sem guardar isso à parte, quais linhas já tinham page_count preenchido
  // antes desta migration rodar) — down() é intencionalmente um no-op.
  async down() {},
};
