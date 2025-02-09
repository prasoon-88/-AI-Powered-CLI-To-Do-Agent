import { ilike, eq } from "drizzle-orm";
import { db } from "../../db";
import { todosTable } from "../../db/schema";

async function getAllTodos() {
  try {
    const todos = await db.select().from(todosTable);
    return todos;
  } catch (error) {
    console.log(error);
  }
}

async function createTodo(todo: string) {
  try {
    const [rTodo] = await db
      .insert(todosTable)
      .values({
        todo,
      })
      .returning({
        id: todosTable.id,
      });
    return rTodo.id;
  } catch (error) {
    console.log(error);
  }
}

async function searchTodo(todo: string) {
  try {
    return await db
      .select()
      .from(todosTable)
      .where(ilike(todosTable.todo, `%${todo}%`));
  } catch (error) {
    console.log(error);
  }
}

async function deleteTodoById(id: number) {
  try {
    return await db.delete(todosTable).where(eq(todosTable.id, id));
  } catch (error) {
    console.log(error);
  }
}

async function clearAllTodos() {
  try {
    return await db.delete(todosTable);
  } catch (error) {
    console.log(error);
  }
}

export const todoTools = {
  getAllTodos,
  createTodo,
  searchTodo,
  deleteTodoById,
  clearAllTodos,
};
